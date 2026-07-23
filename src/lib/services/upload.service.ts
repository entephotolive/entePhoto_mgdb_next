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
  UploadQueueItem,
} from "@/store/upload-store";
import { api } from "@/app/api/api-client";
import { isAllowedFile } from "@/lib/utils/upload-constants";

const DUPLICATE_CHECK_BATCH_SIZE = 100;
const MOBILE_UPLOAD_CONCURRENCY = 2;
const DESKTOP_UPLOAD_CONCURRENCY = 6;

/**
 * Maximum safe canvas area (pixels).
 * 16 MP is safe on all modern browsers including iOS Safari on all device tiers.
 */
const SAFE_CANVAS_MAX_PIXELS = 16_000_000;

/** Threshold (in bytes) below which we skip client-side re-compression if already safe size */
const SKIP_COMPRESSION_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Resize & compress a user-uploaded image using native browser EXIF handling + Canvas.
 *
 * Key design decisions:
 *  1. createImageBitmap(file, { imageOrientation: "from-image" }) decodes AND auto-orients
 *     the image natively according to its EXIF tag. bitmap.width and bitmap.height reflect
 *     the true, post-orientation visual dimensions.
 *
 *  2. NO manual transform matrices or manual rotation calls are used,
 *     eliminating all EXIF orientation calculation bugs by construction.
 *
 *  3. Aspect ratio is preserved exactly: targetH is computed directly from targetW / aspectRatio.
 *
 *  4. Visually lossless output: JPEG quality 0.92, and files already under 3MB (and within
 *     safe pixel/dimension limits) bypass re-compression entirely.
 *
 *  5. Fallback safety: If createImageBitmap or imageOrientation fails, the catch block
 *     returns the original file unchanged so the server-side pipeline can handle orientation/resizing.
 */
async function compressImage(file: File, maxSizePx = Infinity, quality = 0.92): Promise<File> {
  if (!isAllowedFile(file)) return file;

  try {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fallback: If native createImageBitmap with imageOrientation is unsupported or fails,
      // skip client-side processing entirely and let the server handle EXIF rotation & resizing.
      return file;
    }

    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const maxDim = Math.max(srcW, srcH);
    const totalPixels = srcW * srcH;

    const exceedsMaxDim = Number.isFinite(maxSizePx) && maxDim > maxSizePx;
    const exceedsPixels = totalPixels > SAFE_CANVAS_MAX_PIXELS;
    const exceedsFileSize = file.size > SKIP_COMPRESSION_SIZE_BYTES;

    // Skip client-side re-encoding if file is already under size & dimension limits
    if (!exceedsMaxDim && !exceedsPixels && !exceedsFileSize) {
      bitmap.close();
      return file;
    }

    // Determine scale factor
    let scale = 1.0;
    if (exceedsMaxDim) {
      scale = Math.min(scale, maxSizePx / maxDim);
    }
    if (exceedsPixels) {
      scale = Math.min(scale, Math.sqrt(SAFE_CANVAS_MAX_PIXELS / totalPixels));
    }

    // Compute target dimensions preserving exact aspect ratio
    const aspectRatio = srcW / srcH;
    let targetW = srcW;
    let targetH = srcH;
    if (scale < 1.0) {
      targetW = Math.round(srcW * scale);
      targetH = Math.round(targetW / aspectRatio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // White background for PNG transparency support
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw native oriented bitmap directly onto canvas — zero manual matrix transform!
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outputMime = "image/jpeg";
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, outputMime, quality),
    );

    // Release canvas memory immediately
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) return file;

    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: outputMime, lastModified: file.lastModified });
  } catch {
    // Return original file on any error so upload is never blocked
    return file;
  }
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

async function uploadSingleItem(item: UploadQueueItem, context: UploadContext) {
  useUploadStore.getState()._setCurrentFileName(item.file.name);
  useUploadStore.getState()._updateItem(item.id, { status: "uploading", progress: 0, error: undefined });

  const maxAttempts = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    const itemController = new AbortController();
    registerXhr(item.id, { abort: () => itemController.abort() } as any);

    try {
      const fileToUpload = await compressImage(item.file);

      const formData = new FormData();
      formData.append("event_id", String(context.eventId));
      formData.append("images", fileToUpload);
      if (context.uploadedBy) {
        formData.append("uploadedBy", String(context.uploadedBy));
      }
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
        const expectedName = item.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const reasonObj =
          responseData.reason_why_not_uploaded?.find((r: any) => r.filename === expectedName) ||
          responseData.reason_why_not_uploaded?.[0];
        throw new Error(reasonObj?.reason || "Image not uploaded");
      }

      useUploadStore.getState()._updateItem(item.id, { status: "completed", progress: 100 });
      return { ok: true as const };
    } catch (error: any) {
      lastError = error;
      console.error(`Upload Attempt ${attempt}/${maxAttempts} Error for ${item.file.name}:`, error);
      const isCancelled = error?.name === "CanceledError" || error?.message === "canceled";

      if (isCancelled) {
        useUploadStore.getState()._updateItem(item.id, {
          status: "failed",
          progress: 0,
          error: "Cancelled",
        });
        return { ok: false as const, cancelled: true as const };
      }

      if (attempt < maxAttempts) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    } finally {
      unregisterXhr(item.id);
    }
  }

  useUploadStore.getState()._updateItem(item.id, {
    status: "failed",
    progress: 0,
    error: lastError?.response?.data?.detail || lastError?.message || "Upload failed after retries",
  });
  return { ok: false as const, cancelled: false as const };
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
    const filenames = toUpload.map((i) => i.file.name.replace(/\.[^/.]+$/, "") + ".jpg");
    const duplicateSet = await checkDuplicates(context.eventId, filenames);

    if (duplicateSet.size > 0) {
      toUpload.forEach((item) => {
        const expectedName = item.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        if (duplicateSet.has(expectedName)) {
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
