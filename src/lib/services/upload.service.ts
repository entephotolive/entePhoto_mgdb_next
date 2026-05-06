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

const DUPLICATE_CHECK_BATCH_SIZE = 100;
const MOBILE_UPLOAD_CONCURRENCY = 2;
const DESKTOP_UPLOAD_CONCURRENCY = 6;

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
          canvas.width = 0;
          canvas.height = 0;
          img.src = "";
          if (!blob) { resolve(file); return; }
          // Change extension to .webp but keep original name base
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          resolve(new File([blob], newFileName, { type: "image/webp", lastModified: file.lastModified }));
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      img.src = "";
      resolve(file);
    };
    img.src = url;
  });
}

function getUploadConcurrency() {
  if (typeof window === "undefined") return DESKTOP_UPLOAD_CONCURRENCY;

  const browserNavigator = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = browserNavigator.deviceMemory ?? Infinity;
  const hardwareConcurrency = browserNavigator.hardwareConcurrency ?? Infinity;
  const isSmallScreen = window.innerWidth < 768;
  const isTouchDevice =
    window.matchMedia?.("(pointer: coarse)").matches ??
    "ontouchstart" in window;

  if (isSmallScreen || isTouchDevice || deviceMemory <= 4 || hardwareConcurrency <= 4) {
    return MOBILE_UPLOAD_CONCURRENCY;
  }

  return DESKTOP_UPLOAD_CONCURRENCY;
}

async function checkDuplicates(eventId: string, filenames: string[]) {
  const duplicateSet = new Set<string>();

  for (let index = 0; index < filenames.length; index += DUPLICATE_CHECK_BATCH_SIZE) {
    const batch = filenames.slice(index, index + DUPLICATE_CHECK_BATCH_SIZE);
    const dupRes = await fetch("/api/photos/check-duplicate", {
      method: "POST",
      body: JSON.stringify({ eventId, filenames: batch }),
      headers: { "Content-Type": "application/json" },
    });

    if (!dupRes.ok) {
      throw new Error(`Duplicate check failed with status ${dupRes.status}`);
    }

    const { duplicates } = await dupRes.json();
    if (Array.isArray(duplicates)) {
      duplicates.forEach((name) => duplicateSet.add(name));
    }
  }

  return duplicateSet;
}

async function uploadSingleItem(item: (typeof useUploadStore.getState)["items"][number], context: UploadContext) {
  useUploadStore.getState()._setCurrentFileName(item.file.name);
  useUploadStore.getState()._updateItem(item.id, { status: "uploading", progress: 0, error: undefined });

  const itemController = new AbortController();
  registerXhr(item.id, { abort: () => itemController.abort() } as any);

  try {
    const fileToUpload = await compressImage(item.file);

    const formData = new FormData();
    formData.append("event_id", String(context.eventId));
    formData.append("images", fileToUpload);
    if (context.folderId) {
      formData.append("folder_id", context.folderId);
    }

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
      },
    });

    const responseData = response.data;
    if (responseData && responseData.images_not_uploaded > 0) {
      const reasonObj =
        responseData.reason_why_not_uploaded?.find((r: any) => r.filename === item.file.name) ||
        responseData.reason_why_not_uploaded?.[0];
      throw new Error(reasonObj?.reason || "Image not uploaded");
    }

    useUploadStore.getState()._updateItem(item.id, { status: "completed", progress: 100 });
    return { ok: true as const };
  } catch (error: any) {
    console.error(`Upload Error for ${item.file.name}:`, error);
    const isCancelled = error.name === "CanceledError" || error.message === "canceled";

    if (isCancelled && !useUploadStore.getState().items.find((i) => i.id === item.id)) {
      return { ok: false as const, cancelled: true as const };
    }

    useUploadStore.getState()._updateItem(item.id, {
      status: "failed",
      progress: 0,
      error: isCancelled
        ? "Cancelled"
        : (error.response?.data?.detail || error.message || "Upload failed"),
    });

    return { ok: false as const, cancelled: isCancelled };
  } finally {
    unregisterXhr(item.id);
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let currentIndex = 0;

  async function runWorker() {
    while (currentIndex < items.length) {
      const item = items[currentIndex];
      currentIndex += 1;
      await worker(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
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

  try {
    const filenames = toUpload.map((i) => i.file.name);
    const duplicateSet = await checkDuplicates(context.eventId, filenames);

    if (duplicateSet.size > 0) {
      toUpload.forEach((item) => {
        if (duplicateSet.has(item.file.name)) {
          useUploadStore.getState()._updateItem(item.id, {
            status: "duplicate",
            error: "File already exists",
            progress: 0,
          });
        }
      });
    }
  } catch (err) {
    console.error("Duplicate check failed", err);
  }

  const finalToUpload = toUpload.filter((item) => {
    const stateItem = useUploadStore.getState().items.find((i) => i.id === item.id);
    return stateItem && stateItem.status !== "duplicate";
  });

  if (finalToUpload.length === 0) {
    const finalStore = useUploadStore.getState();
    finalStore._setUploading(false);
    finalStore._setCurrentFileName("");
    if (
      finalStore.items.filter(
        (i) => i.status === "queued" || i.status === "uploading",
      ).length === 0
    ) {
      finalStore._setStatus("success");
    } else {
      finalStore._setStatus("idle");
    }
    return;
  }

  let hasFailures = false;
  const concurrency = getUploadConcurrency();

  await runWithConcurrency(finalToUpload, concurrency, async (item) => {
    const result = await uploadSingleItem(item, context);
    if (!result.ok && !result.cancelled) {
      hasFailures = true;
    }
  });

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
