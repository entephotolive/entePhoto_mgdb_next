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
import { api } from "@/app/api/api-client";

/**
 * Resize & compress an image using the Canvas API before upload.
 * - Max dimension: 2560px (2K Resolution). Sharp enough for all screens.
 * - Output: WebP at 90% quality (High-end social media standard).
 * - Keeps the original filename.
 */
async function compressImage(file: File, maxSizePx = 2560, quality = 0.90): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      
      // If the image is already smaller than our limit, don't downscale it,
      // just re-encode it to WebP to save space.
      const scale = Math.min(1, maxSizePx / Math.max(w, h));

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      
      // Use high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to WebP for superior quality-to-size ratio
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Change extension to .webp but keep original name base
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          resolve(new File([blob], newFileName, { type: "image/webp", lastModified: file.lastModified }));
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

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

  toUpload.forEach(item => {
    store._updateItem(item.id, { status: "uploading", progress: 0 });
  });

  let hasFailures = false;

  const uploadPromises = toUpload.map(async (item) => {
    try {
      // Compress before upload: resize to ≤1600px, JPEG 85% quality.
      // Cuts transfer time by ~70% and speeds up backend face detection.
      const fileToUpload = await compressImage(item.file);

      const formData = new FormData();
      formData.append("event_id", String(context.eventId));
      formData.append("images", fileToUpload);
      if (context.folderId) {
        formData.append("folder_id", context.folderId);
      }

      // Create a single use AbortController for this upload
      const itemController = new AbortController();
      registerXhr(item.id, { abort: () => itemController.abort() } as any);

      const response = await api.post("api/upload-images/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        signal: itemController.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            useUploadStore.getState()._updateItem(item.id, { progress });
          }
        }
      });

      const responseData = response.data;
      if (responseData && responseData.images_not_uploaded > 0) {
        const reasonObj = responseData.reason_why_not_uploaded?.find((r: any) => r.filename === item.file.name) || responseData.reason_why_not_uploaded?.[0];
        throw new Error(reasonObj?.reason || "Image not uploaded");
      }

      unregisterXhr(item.id);
      useUploadStore.getState()._updateItem(item.id, { status: "completed", progress: 100 });
    } catch (error: any) {
      console.error(`Upload Error for ${item.file.name}:`, error);
      hasFailures = true;
      const isCancelled = error.name === 'CanceledError' || error.message === 'canceled';

      unregisterXhr(item.id);

      if (isCancelled && !useUploadStore.getState().items.find(i => i.id === item.id)) {
        return;
      }

      useUploadStore.getState()._updateItem(item.id, {
        status: "failed",
        progress: 0,
        error: isCancelled ? "Cancelled" : (error.response?.data?.detail || error.message || "Upload failed"),
      });
    }
  });

  await Promise.all(uploadPromises);

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
    finalStore._setStatus("idle");
  }
}
