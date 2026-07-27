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
import { computeCanvasDimensions } from "@/lib/utils/canvas-utils";

const DUPLICATE_CHECK_BATCH_SIZE = 100;
const MOBILE_UPLOAD_CONCURRENCY = 2;
const DESKTOP_UPLOAD_CONCURRENCY = 6;

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
    // ── Phase 1: probe dimensions with a lightweight decode ───────────────────
    // We need srcW/srcH to compute the scale factor before the real decode.
    // Use a plain createImageBitmap (no resize options) on a tiny slice — the
    // browser still returns correct .width/.height even for a 0-byte source rect.
    // In practice this is near-instant: the codec only reads the image header.
    let probeBitmap: ImageBitmap;
    try {
      probeBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fallback: If native createImageBitmap with imageOrientation is unsupported or fails,
      // skip client-side processing entirely and let the server handle EXIF rotation & resizing.
      return file;
    }

    const srcW = probeBitmap.width;
    const srcH = probeBitmap.height;
    probeBitmap.close(); // release immediately — we only needed the dimensions

    const exceedsFileSize = file.size > SKIP_COMPRESSION_SIZE_BYTES;

    // computeCanvasDimensions handles both the pixel-budget constraint AND the
    // optional maxSizePx cap with a single uniform scale factor.
    const { targetW, targetH, resizeOptions } = computeCanvasDimensions(srcW, srcH, maxSizePx);

    // Skip client-side re-encoding if file is already under all limits
    if (resizeOptions === null && !exceedsFileSize) {
      return file;
    }

    // ── Phase 2: decode at target size (downscale happens inside the codec) ───
    // Passing resizeWidth/resizeHeight means the browser downscales *during*
    // decode — a 200 MP source buffer is never fully materialised in memory.
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
        ...(resizeOptions ?? {}),
      });
    } catch {
      return file;
    }

    // bitmap.width/height now equal targetW/targetH (or srcW/srcH when no resize).
    const drawW = bitmap.width;
    const drawH = bitmap.height;

    const canvas = document.createElement("canvas");
    canvas.width = drawW;
    canvas.height = drawH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // White background for PNG transparency support
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, drawW, drawH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw native oriented bitmap directly onto canvas — zero manual matrix transform!
    // bitmap is already at the right size so we draw 1:1 (no scaling by drawImage).
    ctx.drawImage(bitmap, 0, 0, drawW, drawH);
    bitmap.close();

    try {
      // ── Draw-failure detection ────────────────────────────────────────────────
      // Sample a few scattered 2×2 pixel regions to guard against the race where
      // the bitmap was closed before the GPU rasteriser flushed, producing a
      // fully-black or fully-transparent canvas (silent draw failure).
      const sampleRegions = [
        [0, 0],
        [Math.floor(drawW / 2), Math.floor(drawH / 2)],
        [drawW - 2, drawH - 2],
      ] as const;
      const isDrawFailure = sampleRegions.every(([sx, sy]) => {
        const { data } = ctx.getImageData(Math.max(0, sx), Math.max(0, sy), 2, 2);
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          // Transparent pixel OR solid-black pixel are both failure signatures
          if (!((r === 0 && g === 0 && b === 0 && (a === 0 || a === 255)))) return false;
        }
        return true;
      });
      if (isDrawFailure) {
        console.warn("[upload.service] drawImage produced a black/transparent canvas – returning original file");
        return file;
      }
      // ─────────────────────────────────────────────────────────────────────────

      const outputMime = "image/jpeg";
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, outputMime, quality),
      );

      if (!blob) return file;

      const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
      return new File([blob], newName, { type: outputMime, lastModified: file.lastModified });
    } finally {
      // Release canvas GPU memory on every path (success, draw-failure, toBlob error)
      canvas.width = 0;
      canvas.height = 0;
    }
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
