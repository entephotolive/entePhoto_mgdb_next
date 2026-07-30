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
import {
  computeCanvasDimensions,
  fillCanvasWhite,
  isCanvasDrawFailure,
} from "@/lib/utils/canvas-utils";
import {
  supportsImageOrientation,
  readJpegExifOrientation,
  getOrientationTransform,
} from "@/lib/utils/exif-orientation";

// Warm the capability cache at module import time.
// This is a Promise that resolves to true/false and is subsequently cached
// synchronously — subsequent reads inside compressImage are instant.
supportsImageOrientation().catch(() => {});

const DUPLICATE_CHECK_BATCH_SIZE = 100;
const MOBILE_UPLOAD_CONCURRENCY = 2;
const DESKTOP_UPLOAD_CONCURRENCY = 6;

// M09: more retry attempts on mobile (5 vs 3) to outlast brief cellular gaps
const MOBILE_MAX_UPLOAD_ATTEMPTS = 5;
const DESKTOP_MAX_UPLOAD_ATTEMPTS = 3;

/** Threshold (in bytes) below which we skip client-side re-compression if already safe size */
const SKIP_COMPRESSION_SIZE_BYTES = 2 * 1024 * 1024; // 3 MB

const STALL_BACKSTOP_MS = 60_000; // 60 s — longer than M11's 45 s UI threshold

/** Ceiling (120 s) after which a queue stuck in isUploading with no progress is force-reset */
const QUEUE_STALENESS_CEILING_MS = 120_000;
let lastUploadActivityAt = Date.now();

/**
 * Yield control back to the main thread/browser event loop.
 * Ensures DOM renders, CSS animations, and microtasks execute smoothly
 * during large batch image processing (e.g. 50+ files).
 */
function yieldToMain(): Promise<void> {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return new Promise((resolve) => window.requestIdleCallback(() => resolve(), { timeout: 50 }));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ── M13: Web Worker singleton for off-main-thread compression ────────────────────
// Worker is created once and reused. If OffscreenCanvas isn't available (Safari)
// the worker itself returns null and we fall back to the main-thread path.
let _compressionWorker: Worker | null = null;

function getCompressionWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (!_compressionWorker) {
    try {
      _compressionWorker = new Worker(
        new URL("../workers/compress-worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      _compressionWorker = null;
    }
  }
  return _compressionWorker;
}

/**
 * Sends a file to the compression Web Worker.
 * Returns the compressed Blob, or null if the worker is unavailable or
 * returns null (e.g. Safari — OffscreenCanvas not supported in workers).
 */
function compressViaWorker(
  file: File,
  maxSizePx: number,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const worker = getCompressionWorker();
    if (!worker) {
      resolve(null);
      return;
    }
    const id = crypto.randomUUID();
    const onMessage = (evt: MessageEvent) => {
      if (evt.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve(evt.data.blob ?? null); // blob is null when worker signals fallback needed
    };
    const onError = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve(null);
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ id, file, maxSizePx, quality });
  });
}

/**
 * M13: Top-level compression entry point.
 * Tries the Web Worker (off-main-thread, OffscreenCanvas) first.
 * Falls back to the main-thread compressImage() for Safari or any
 * browser where OffscreenCanvas isn't supported in workers.
 * Logs which path was used in development builds so it's monitorable.
 */
async function compressImageWithWorker(
  file: File,
  maxSizePx = Infinity,
  quality = 0.92,
): Promise<{ compressedFile: File; previewBlobUrl: string | null }> {
  // Attempt off-main-thread path
  const workerBlob = await compressViaWorker(file, maxSizePx, quality);

  if (workerBlob) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[compress] worker path ✓ — ${file.name}`);
    }
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    const compressedFile = new File([workerBlob], newName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    const previewBlobUrl = URL.createObjectURL(workerBlob);
    return { compressedFile, previewBlobUrl };
  }

  // Fallback: main-thread path (Safari, or worker returned null for no-op)
  if (process.env.NODE_ENV === "development") {
    console.debug(`[compress] main-thread fallback — ${file.name} (worker unavailable or no-op)`);
  }
  const compressedFile = await compressImage(file, maxSizePx, quality);
  // For HEIC files compressed on main thread, produce a preview URL from the result
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");
  const previewBlobUrl =
    isHeic && compressedFile !== file
      ? URL.createObjectURL(compressedFile)
      : null;
  return { compressedFile, previewBlobUrl };
}

/**
 * Resize & compress a user-uploaded image using native browser EXIF handling + Canvas.
 *
 * Key design decisions:
 *  1. Primary path: createImageBitmap(file, { imageOrientation: "from-image" }) decodes AND
 *     auto-orients the image natively according to its EXIF tag.
 *
 *  2. Fallback path (iOS < 15.4, which does not support imageOrientation):
 *     createImageBitmap() without imageOrientation, then apply a manual canvas transform
 *     derived from a lightweight hand-rolled JPEG EXIF parser (no external dependency).
 *     The transform matrices are the same ones validated in earlier rotation-fix work.
 *
 *  3. NO manual transform matrices are used on the primary path.
 *
 *  4. Aspect ratio is preserved exactly.
 *
 *  5. Fallback safety: If both paths fail, the catch block returns the original file
 *     unchanged so the server-side pipeline can handle orientation/resizing.
 *
 * ⚠️  M05 DEVICE CONFIRMATION REQUIRED:
 *     The imageOrientation fallback (M05 fix) must be verified on a real device running
 *     iOS 14 or iOS 15.0–15.3 before this finding is considered closed.
 *     The capability check (supportsImageOrientation) is reliable per MDN/WebKit notes,
 *     but the EXIF rotation transform on HEIC files on those OS versions needs hands-on
 *     testing. Mark as confirmed only after running the Phase 6 device test.
 */
async function compressImage(file: File, maxSizePx = Infinity, quality = 0.92): Promise<File> {
  if (!isAllowedFile(file)) return file;

  // Yield to main thread before starting heavy CPU/GPU decode
  await yieldToMain();

  // Check imageOrientation support once (result is cached after first call)
  const nativeOrientation = await supportsImageOrientation();

  try {
    // ── Phase 1: probe dimensions ─────────────────────────────────────────────
    // Decode the image once to read dimensions and (on the fallback path) EXIF
    // orientation. The bitmap is released immediately after reading .width/.height.
    let probeBitmap: ImageBitmap;
    let exifOrientation = 1; // default: no correction needed

    try {
      if (nativeOrientation) {
        // Primary path: browser handles EXIF rotation natively
        probeBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } else {
        // M05 Fallback path (iOS < 15.4):
        // Decode without orientation, read EXIF tag separately
        probeBitmap = await createImageBitmap(file);
        exifOrientation = await readJpegExifOrientation(file);
      }
    } catch {
      // If createImageBitmap itself fails (unsupported format etc.),
      // pass the file through unchanged — server handles it.
      return file;
    }

    const srcW = probeBitmap.width;
    const srcH = probeBitmap.height;
    probeBitmap.close(); // release immediately — we only needed the dimensions

    const exceedsFileSize = file.size > SKIP_COMPRESSION_SIZE_BYTES;

    // computeCanvasDimensions handles both the pixel-budget constraint AND the
    // optional maxSizePx cap with a single uniform scale factor.
    // On the fallback path, srcW/srcH are the raw (unrotated) dimensions —
    // getOrientationTransform() will swap them correctly for 90°/270° cases.
    const { targetW, targetH, resizeOptions } = computeCanvasDimensions(srcW, srcH, maxSizePx);

    // Skip client-side re-encoding if file is already under all limits
    // AND no orientation correction is needed
    if (resizeOptions === null && !exceedsFileSize && exifOrientation === 1) {
      return file;
    }

    // ── Phase 2: decode at target size (downscale happens inside the codec) ───
    let bitmap: ImageBitmap;
    try {
      if (nativeOrientation) {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
          ...(resizeOptions ?? {}),
        });
      } else {
        // M05 Fallback: decode without imageOrientation
        bitmap = await createImageBitmap(file, { ...(resizeOptions ?? {}) });
      }
    } catch {
      return file;
    }

    // bitmap.width/height reflect raw decoded dimensions (not orientation-corrected on fallback)
    const drawW = bitmap.width;
    const drawH = bitmap.height;

    // ── Canvas setup — orientation-aware ──────────────────────────────────────
    let canvasW: number;
    let canvasH: number;
    let applyOrientationTransform: ((ctx: CanvasRenderingContext2D) => void) | null = null;

    if (!nativeOrientation && exifOrientation !== 1) {
      // M05 Fallback: compute canvas dimensions and transform for this orientation
      const orientTransform = getOrientationTransform(exifOrientation, drawW, drawH);
      canvasW = orientTransform.canvasW;
      canvasH = orientTransform.canvasH;
      applyOrientationTransform = orientTransform.applyTransform;
    } else {
      // Primary path: bitmap is already correctly oriented
      canvasW = drawW;
      canvasH = drawH;
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      // M07: throw a distinguishable error so uploadSingleItem can surface a
      // device-capability-specific message rather than a generic "Upload failed".
      // Retrying this error won't help — it's a device GPU/memory limit.
      throw Object.assign(new Error("canvas-unavailable"), { isCanvasUnavailable: true });
    }

    // White background for PNG transparency support
    fillCanvasWhite(ctx, canvasW, canvasH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (applyOrientationTransform) {
      // M05 Fallback: apply the EXIF rotation matrix before drawing
      ctx.save();
      applyOrientationTransform(ctx);
      ctx.drawImage(bitmap, 0, 0, drawW, drawH);
      ctx.restore();
    } else {
      // Primary path: draw native-oriented bitmap directly
      ctx.drawImage(bitmap, 0, 0, canvasW, canvasH);
    }
    bitmap.close();

    try {
      if (isCanvasDrawFailure(ctx, canvasW, canvasH)) {
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

// M10: detect mobile/touch with improved weighting.
// deviceMemory is absent on iOS Safari (returns undefined) — absence is NOT
// a signal of a powerful device; treat it as inconclusive.
// Touch capability and screen width are the primary, reliable signals.
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  const isTouchDevice =
    window.matchMedia?.("(pointer: coarse)").matches ??
    "ontouchstart" in window;
  const isSmallScreen = window.innerWidth < 768;

  // Strong signals: touch OR narrow screen — call it mobile immediately.
  if (isTouchDevice || isSmallScreen) return true;

  // Weak signals: only use deviceMemory/hardwareConcurrency as tiebreakers
  // on devices where the primary signals were inconclusive (wide-screen tablets
  // with stylus, laptops with touchscreen etc.).
  const browserNavigator = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = browserNavigator.deviceMemory; // undefined on iOS Safari — skip if so
  const hardwareConcurrency = browserNavigator.hardwareConcurrency ?? Infinity;

  if (deviceMemory !== undefined && deviceMemory <= 4) return true;
  if (hardwareConcurrency <= 4) return true;

  return false;
}

function getUploadConcurrency() {
  if (typeof navigator !== "undefined") {
    const conn = (navigator as any).connection;
    const effectiveType: string = conn?.effectiveType ?? "";
    if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g") {
      return 1;
    }
  }
  return isMobileDevice() ? MOBILE_UPLOAD_CONCURRENCY : DESKTOP_UPLOAD_CONCURRENCY;
}

/**
 * M08: Return an Axios-compatible timeout (ms) scaled to the current
 * network conditions.
 *
 * Reads navigator.connection.effectiveType where available (Android Chrome,
 * some Android Firefox). Falls back to 120 s for unknown conditions.
 *
 * Thresholds:
 *   slow-2g / 2g : 8 min — a 20 MB HEIC at 50 Kbps needs ~53 min;
 *                           8 min is a reasonable ceiling before retry
 *   3g           : 5 min — a 20 MB file at 300 Kbps takes ~9 min, 5 min is mid-retry
 *   4g           : 3 min — a 20 MB file at 1 Mbps takes ~2.5 min
 *   default/wifi : 2 min — existing default; fine for high-bandwidth paths
 */
function getUploadTimeout(): number {
  if (typeof navigator === "undefined") return 120_000;

  const conn = (navigator as any).connection;
  const effectiveType: string = conn?.effectiveType ?? "";

  switch (effectiveType) {
    case "slow-2g":
    case "2g":
      return 8 * 60 * 1000;  // 8 min
    case "3g":
      return 5 * 60 * 1000;  // 5 min
    case "4g":
      return 3 * 60 * 1000;  // 3 min
    default:
      return 2 * 60 * 1000;  // 2 min (existing default)
  }
}

async function checkDuplicates(eventId: string, filenames: string[]) {
  const duplicateSet = new Set<string>();

  for (let index = 0; index < filenames.length; index += DUPLICATE_CHECK_BATCH_SIZE) {
    const batch = filenames.slice(index, index + DUPLICATE_CHECK_BATCH_SIZE);
    const dupRes = await fetch("/api/check-duplicate", {
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
  useUploadStore.getState()._updateItem(item.id, {
    status: "uploading",
    progress: 0,
    error: undefined,
    // M11: record when this item entered 'uploading' for stall-detection
    stalledSince: Date.now(),
  });

  // M09: more retry attempts on mobile to survive brief cellular gaps
  const mobile = isMobileDevice();
  const maxAttempts = mobile ? MOBILE_MAX_UPLOAD_ATTEMPTS : DESKTOP_MAX_UPLOAD_ATTEMPTS;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;

    // M12: abort-shim backstop — if the item has been in 'uploading' longer
    // than STALL_BACKSTOP_MS with no progress update, the OS has almost certainly
    // killed the XHR (iOS Safari tab suspension). Self-fail now instead of waiting
    // for a timeout that may never fire.
    const currentItem = useUploadStore.getState().items.find((i) => i.id === item.id);
    if (
      currentItem?.stalledSince !== undefined &&
      Date.now() - currentItem.stalledSince > STALL_BACKSTOP_MS
    ) {
      useUploadStore.getState()._updateItem(item.id, {
        status: "failed",
        progress: 0,
        error: "Upload interrupted — tap retry to continue.",
        stalledSince: undefined,
      });
      return { ok: false as const, cancelled: false as const };
    }

    const itemController = new AbortController();
    registerXhr(item.id, { abort: () => itemController.abort() } as any);

    try {
      // Mobile optimization: cap max dimension to 1920px and quality to 0.85 to shrink
      // ~20MB camera exports down to ~300KB-600KB payloads before sending over mobile networks.
      const targetMaxPx = mobile ? 1920 : Infinity;
      const targetQuality = mobile ? 0.85 : 0.92;
      const { compressedFile, previewBlobUrl } = await compressImageWithWorker(
        item.file,
        targetMaxPx,
        targetQuality,
      );

      // M06: update the preview in the store now that we have a decoded JPEG blob
      if (previewBlobUrl) {
        useUploadStore.getState()._updateItem(item.id, { preview: previewBlobUrl });
      }

      const formData = new FormData();
      formData.append("event_id", String(context.eventId));
      formData.append("images", compressedFile);
      formData.append("idempotency_key", item.id);
      if (context.uploadedBy) {
        formData.append("uploadedBy", String(context.uploadedBy));
      }
      if (context.folderId) {
        formData.append("folder_id", context.folderId);
      }

      const response = await api.post("api/upload-images/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "X-Idempotency-Key": item.id,
        },
        signal: itemController.signal,
        // M08: per-request adaptive timeout based on detected network quality
        timeout: getUploadTimeout(),
        onUploadProgress: (progressEvent) => {
          lastUploadActivityAt = Date.now();
          if (progressEvent.lengthComputable && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Update progress and clear stalledSince (we're actively receiving data)
            useUploadStore.getState()._updateItem(item.id, { progress, stalledSince: undefined });
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

      useUploadStore.getState()._updateItem(item.id, {
        status: "completed",
        progress: 100,
        stalledSince: undefined,
      });
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
          stalledSince: undefined,
        });
        return { ok: false as const, cancelled: true as const };
      }

      // M07: canvas-unavailable is a device-capability failure — retrying won't help.
      // Surface a user-facing message and stop immediately (no retry loop).
      if (error?.isCanvasUnavailable) {
        useUploadStore.getState()._updateItem(item.id, {
          status: "failed",
          progress: 0,
          error: "Your device couldn't process this image — try uploading it individually or from a different device.",
          stalledSince: undefined,
        });
        return { ok: false as const, cancelled: false as const };
      }

      // M08: distinguish Axios timeout from other network errors so the user
      // gets a clear "check your connection" message rather than a generic failure.
      const isTimeout =
        error?.code === "ECONNABORTED" ||
        error?.message?.toLowerCase?.().includes("timeout");
      if (isTimeout) {
        lastError = Object.assign(error, {
          _userMessage: "Upload timed out — check your connection and tap retry.",
        });
      }

      // M09: exponential backoff — 1s, 2s, 4s, 8s, 16s
      if (attempt < maxAttempts) {
        const backoffMs = Math.min(Math.pow(2, attempt - 1) * 1000, 16_000);
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    } finally {
      unregisterXhr(item.id);
    }
  }

  useUploadStore.getState()._updateItem(item.id, {
    status: "failed",
    progress: 0,
    // M08: _userMessage is set for timeout errors; takes precedence over the raw error chain
    error:
      lastError?._userMessage ||
      lastError?.response?.data?.detail ||
      lastError?.message ||
      "Upload failed after retries",
    stalledSince: undefined,
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
      await yieldToMain();
      await worker(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
}

export async function processUploadQueue(context: UploadContext) {
  const store = useUploadStore.getState();

  // Self-healing safety net: If isUploading is true but no progress/activity has occurred
  // for > QUEUE_STALENESS_CEILING_MS (120 s), force-reset isUploading to recover from stuck locks.
  if (store.isUploading && Date.now() - lastUploadActivityAt > QUEUE_STALENESS_CEILING_MS) {
    console.warn("[upload.service] isUploading lock exceeded 120s staleness ceiling without progress — force-resetting lock");
    store._setUploading(false);
  }

  if (store.isUploading || store.items.length === 0) return;

  const toUpload = store.items.filter(
    (i) => i.status === "queued" || i.status === "failed" || i.status === "paused",
  );
  if (toUpload.length === 0) return;

  lastUploadActivityAt = Date.now();
  store._setUploading(true);
  store._setStatus("uploading");
  store.setWidgetVisible(true);

  try {
    const filenames: string[] = [];
    toUpload.forEach((i) => {
      filenames.push(i.file.name);
      const jpgName = i.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
      if (jpgName !== i.file.name) {
        filenames.push(jpgName);
      }
    });

    const duplicateSet = await checkDuplicates(context.eventId, filenames);

    if (duplicateSet.size > 0) {
      toUpload.forEach((item) => {
        const expectedName = item.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const isDuplicateFound =
          duplicateSet.has(item.file.name) || duplicateSet.has(expectedName);

        if (isDuplicateFound) {
          if (item.status === "failed") {
            // Retry recovery: If a retried item failed due to a network drop after
            // the server recorded the upload, checkDuplicates confirms the image
            // exists. Resolve it as 'completed' (100%) rather than a duplicate error.
            useUploadStore.getState()._updateItem(item.id, {
              status: "completed",
              progress: 100,
              error: undefined,
              stalledSince: undefined,
            });
          } else {
            // Pre-existing upload from a prior session/event
            useUploadStore.getState()._updateItem(item.id, {
              status: "duplicate",
              error: "File already exists",
              progress: 0,
            });
          }
        }
      });
    }
  } catch (err) {
    console.error("Duplicate check failed", err);
  }

  const finalToUpload = toUpload.filter((item) => {
    const stateItem = useUploadStore.getState().items.find((i) => i.id === item.id);
    return stateItem && stateItem.status !== "duplicate" && stateItem.status !== "completed";
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
