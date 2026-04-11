/**
 * lib/services/upload.service.ts
 * ─────────────────────────────────────────────────────────────────
 * Houses the pure logic for uploading files to Cloudinary and registering
 * them in the database. De-coupled from the React lifecycle so it can
 * run in the background via the Zustand store.
 */

import {
  registerXhr,
  unregisterXhr,
  useUploadStore,
  UploadContext,
} from "@/store/upload-store";

export async function processUploadQueue(context: UploadContext) {
  const store = useUploadStore.getState();
  if (store.isUploading || store.items.length === 0) return;

  const toUpload = store.items.filter(
    (i) => i.status === "queued" || i.status === "failed",
  );
  if (toUpload.length === 0) return;

  store._setUploading(true);
  store._setStatus("uploading");
  store.setWidgetVisible(true);

  let hasFailures = false;

  for (const item of toUpload) {
    // Check if user cancelled/cleared the queue mid-upload
    const currentStore = useUploadStore.getState();
    if (!currentStore.items.find((i) => i.id === item.id)) {
      continue; // Item was removed
    }

    try {
      store._setCurrentFileName(item.file.name);
      store._updateItem(item.id, { status: "uploading", progress: 0 });

      // 1. Hash file to check for duplicates
      const buffer = await item.file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const checkRes = await fetch("/api/photos/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
      });

      if (!checkRes.ok) throw new Error("Failed to check duplicate");
      const { exists } = await checkRes.json();

      if (exists) {
        store._updateItem(item.id, {
          status: "duplicate",
          progress: 100,
          error: "Already exists",
        });
        continue;
      }

      // 2. Get Cloudinary signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const safeEventName = context.eventName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const folderPath = `photo-ceremony/events/${context.eventId}-${safeEventName}`;

      const paramsToSign = {
        timestamp,
        folder: folderPath,
      };

      const signRes = await fetch("/api/sign-cloudinary-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paramsToSign }),
      });

      if (!signRes.ok) throw new Error("Failed to get upload signature");
      const { signature } = await signRes.json();

      // 3. Upload to Cloudinary via XHR (for progress)
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

      if (!cloudName || !apiKey) {
        throw new Error("Cloudinary configuration is missing");
      }

      const formData = new FormData();
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folderPath);
      // Removed transformation from direct upload params to simplify and avoid signature mismatches
      // We can apply transformations via the URL in the gallery instead
      formData.append("file", item.file);

      const uploadPromise = new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          registerXhr(item.id, xhr);

          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          );

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              useUploadStore.getState()._updateItem(item.id, { progress });
            }
          };

          xhr.onload = () => {
            unregisterXhr(item.id);
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              console.error("Cloudinary Error Response:", xhr.responseText);
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(
                  new Error(
                    errorData.error?.message || "Cloudinary upload failed",
                  ),
                );
              } catch {
                reject(new Error("Cloudinary upload failed"));
              }
            }
          };

          xhr.onerror = () => {
            unregisterXhr(item.id);
            reject(new Error("Network Error"));
          };

          xhr.onabort = () => {
            unregisterXhr(item.id);
            reject(new Error("Upload cancelled"));
          };

          xhr.send(formData);
        },
      );

      const uploadResult = await uploadPromise;

      // 4. Save to database
      const saveRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploadResult.secure_url,
          eventId: context.eventId,
          uploadedBy: context.uploadedBy,
          hash,
          folderId: context.folderId,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.message || "Save failed");
      }

      store._updateItem(item.id, { status: "completed", progress: 100 });
    } catch (error: any) {
      if (error.message === "Upload cancelled") {
        console.log("Upload cancelled for", item.file.name);
        // Item is already removed from store, so nothing more to do
      } else {
        console.error("Upload error for", item.file.name, error);
        hasFailures = true;
        store._updateItem(item.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
  }

  // Finished queue processing
  const finalStore = useUploadStore.getState();
  finalStore._setUploading(false);
  finalStore._setCurrentFileName("");

  if (
    finalStore.items.filter(
      (i) => i.status === "queued" || i.status === "uploading",
    ).length === 0
  ) {
    finalStore._setStatus(hasFailures ? "partial" : "success");
  } else {
    finalStore._setStatus("idle"); // In case items were added during upload
  }
}
