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

const DUPLICATE_CHECK_BATCH_SIZE = 100;
const MOBILE_UPLOAD_CONCURRENCY = 2;
const DESKTOP_UPLOAD_CONCURRENCY = 6;

/** Maximum safe canvas pixel area on iOS Safari (4 Megapixels) */
const IOS_CANVAS_MAX_PIXELS = 4_000_000;

/** Read EXIF orientation tag from a JPEG file (returns 1–8, defaults to 1) */
async function readExifOrientation(file: File): Promise<number> {
  try {
    if (!file.type.includes("jpeg") && !file.type.includes("jpg")) return 1;
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return 1;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset); offset += 2;
      if (marker === 0xffe1) {
        if (view.getUint32(offset + 2) !== 0x45786966) return 1;
        const tiffBase = offset + 8;
        const le = view.getUint16(tiffBase) === 0x4949;
        const ifdOffset = view.getUint32(tiffBase + 4, le);
        const ifdStart = tiffBase + ifdOffset;
        if (ifdStart + 2 > view.byteLength) return 1;
        const entries = view.getUint16(ifdStart, le);
        for (let i = 0; i < entries; i++) {
          const e = ifdStart + 2 + i * 12;
          if (e + 12 > view.byteLength) break;
          if (view.getUint16(e, le) === 0x0112) {
            return view.getUint16(e + 8, le);
          }
        }
        return 1;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        if (offset + 2 > view.byteLength) break;
        offset += view.getUint16(offset);
      }
    }
  } catch { /* silently ignored */ }
  return 1;
}

/**
 * Resize & compress an image using the Canvas API before upload.
 *
 * iOS-safe fixes applied:
 *  1. Reads EXIF orientation and rotates the canvas so portrait iPhone shots
 *     are never sideways after upload.
 *  2. Clamps the canvas to ≤ 4 Megapixels so iOS Safari never crashes or
 *     produces a blank output (the old bug that caused 9 MB files).
 *  3. Always outputs image/jpeg (NOT WebP) because iOS Safari cannot encode
 *     WebP via canvas.toBlob — it silently falls back to PNG, which is huge.
 *  4. Falls back to returning the original file on any error so uploads
 *     are never permanently blocked.
 *
 * Max dimension: 2560 px · Quality: 0.90
 */
async function compressImage(file: File, maxSizePx = 2560, quality = 0.90): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    // ── 1. Read EXIF orientation (JPEG only) ────────────────────────────
    const orientation = await readExifOrientation(file);
    const isRotated90 = orientation >= 5 && orientation <= 8;

    // ── 2. Load the image ───────────────────────────────────────────────
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new window.Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("load failed"));
      el.src = url;
    }).finally(() => URL.revokeObjectURL(url));

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // Logical dimensions after applying orientation rotation
    const logicW = isRotated90 ? srcH : srcW;
    const logicH = isRotated90 ? srcW : srcH;

    // ── 3. Scale to fit within maxSizePx AND iOS canvas pixel cap ───────
    const maxDimScale = Math.min(1, maxSizePx / Math.max(logicW, logicH));
    const pixelScale = Math.min(1, Math.sqrt(IOS_CANVAS_MAX_PIXELS / (logicW * logicH)));
    const scale = Math.min(maxDimScale, pixelScale);

    const canvasW = Math.round(logicW * scale);
    const canvasH = Math.round(logicH * scale);

    // ── 4. Draw with EXIF rotation applied ──────────────────────────────
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Apply EXIF orientation transform
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0,  1, canvasW, 0);       break;
      case 3: ctx.transform(-1, 0, 0, -1, canvasW, canvasH); break;
      case 4: ctx.transform( 1, 0, 0, -1, 0, canvasH);       break;
      case 5: ctx.transform( 0, 1, 1,  0, 0, 0);             break;
      case 6: ctx.transform( 0, 1,-1,  0, canvasH, 0);       break;
      case 7: ctx.transform( 0,-1,-1,  0, canvasW, canvasH); break;
      case 8: ctx.transform( 0,-1, 1,  0, 0, canvasW);       break;
    }
    // Scale after the rotation transform
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, srcW, srcH);

    // ── 5. Encode as JPEG ────────────────────────────────────────────────
    // WebP is NOT used here because iOS Safari's canvas.toBlob silently falls
    // back to PNG when it can't encode WebP, which produces files that are
    // LARGER than the original (the exact 3 MB → 9 MB bug reported).
    const outputMime = "image/jpeg";
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, outputMime, quality)
    );

    // Release canvas memory
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) return file;

    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: outputMime, lastModified: file.lastModified });
  } catch {
    return file; // Always fall back to original on any error
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
      const expectedName = item.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
      const reasonObj =
        responseData.reason_why_not_uploaded?.find((r: any) => r.filename === expectedName) ||
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
