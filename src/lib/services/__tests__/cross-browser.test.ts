// @ts-ignore
import { describe, expect, test, mock, spyOn } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { api } from "@/app/api/api-client";
import { isAllowedFile } from "@/lib/utils/upload-constants";

describe("Cross-Browser & Cross-Device Upload Reliability", () => {
  test("api client has explicit 120s timeout for mobile network upload resilience", () => {
    expect(api.defaults.timeout).toBe(120000);
  });

  test("accepts files from mobile photo pickers with various MIME types and extensions", () => {
    const iosCameraFile = new File([new Uint8Array([1, 2, 3])], "IMG_4921.JPG", { type: "image/jpeg" });
    const iosShareSheetFile = new File([new Uint8Array([1, 2, 3])], "IMG_4922.HEIC", { type: "" });
    const androidGalleryFile = new File([new Uint8Array([1, 2, 3])], "20260722_120401.jpg", { type: "image/jpeg" });

    expect(isAllowedFile(iosCameraFile)).toBe(true);
    expect(isAllowedFile(iosShareSheetFile)).toBe(true);
    expect(isAllowedFile(androidGalleryFile)).toBe(true);
  });
});

describe("Aspect Ratio Preservation (Exact scaling within 0.1% tolerance)", () => {
  const SAFE_CANVAS_MAX_PIXELS = 16_000_000;

  /**
   * Downscale dimension computation helper: exact logic used across
   * upload.service.ts, watermark.ts, compress-image.ts.
   */
  function calcScaledDimensions(
    srcW: number,
    srcH: number,
    maxSizePx = Infinity,
  ): { targetW: number; targetH: number; inputRatio: number; outputRatio: number } {
    const maxDim = Math.max(srcW, srcH);
    const totalPixels = srcW * srcH;

    let scale = 1.0;
    if (Number.isFinite(maxSizePx) && maxDim > maxSizePx) {
      scale = Math.min(scale, maxSizePx / maxDim);
    }
    if (totalPixels > SAFE_CANVAS_MAX_PIXELS) {
      scale = Math.min(scale, Math.sqrt(SAFE_CANVAS_MAX_PIXELS / totalPixels));
    }

    const aspectRatio = srcW / srcH;
    let targetW = srcW;
    let targetH = srcH;
    if (scale < 1.0) {
      targetW = Math.round(srcW * scale);
      targetH = Math.round(targetW / aspectRatio);
    }

    return {
      targetW,
      targetH,
      inputRatio: aspectRatio,
      outputRatio: targetW / targetH,
    };
  }

  const testRatios = [
    { name: "9:16 portrait (5304×7952, 42MP)", w: 5304, h: 7952 },
    { name: "16:9 landscape (7952×5304, 42MP)", w: 7952, h: 5304 },
    { name: "1:1 square (6000×6000, 36MP)", w: 6000, h: 6000 },
    { name: "4:3 standard (6000×4500, 27MP)", w: 6000, h: 4500 },
    { name: "3:2 DSLR (6000×4000, 24MP)", w: 6000, h: 4000 },
  ];

  for (const item of testRatios) {
    test(`preserves aspect ratio within 0.1% for ${item.name}`, () => {
      const res = calcScaledDimensions(item.w, item.h);
      const relativeDiff = Math.abs(res.outputRatio - res.inputRatio) / res.inputRatio;
      expect(relativeDiff).toBeLessThan(0.001); // < 0.1%
    });
  }

  test("does not distort 9:16 portrait when scaled down to max 1920px", () => {
    const res = calcScaledDimensions(5304, 7952, 1920);
    expect(Math.abs(res.targetH - 1920)).toBeLessThanOrEqual(1);
    expect(res.targetW).toBe(1281);
    const diff = Math.abs(res.outputRatio - res.inputRatio) / res.inputRatio;
    expect(diff).toBeLessThan(0.001);
  });
});

describe("Native EXIF Orientation Contract & Expected Output Dimensions", () => {
  /**
   * Browser-native createImageBitmap(file, { imageOrientation: 'from-image' })
   * returns a bitmap whose .width and .height are ALREADY post-orientation.
   *
   * EXIF Orientation Tag specifications:
   *  1 (Normal):            unrotated (srcW × srcH)
   *  3 (180°):              upside down (srcW × srcH)
   *  6 (90° CW / Portrait): rotated 90° CW -> displayed dimensions = srcH × srcW
   *  8 (270° CW / Portrait):rotated 270° CW -> displayed dimensions = srcH × srcW
   */
  function getOrientedDimensions(
    rawW: number,
    rawH: number,
    exifOrientation: number,
  ): { width: number; height: number; isPortrait: boolean } {
    const isRotated90 = exifOrientation >= 5 && exifOrientation <= 8;
    const width = isRotated90 ? rawH : rawW;
    const height = isRotated90 ? rawW : rawH;
    return {
      width,
      height,
      isPortrait: height > width,
    };
  }

  test("orientation 1: 5304×7952 portrait stays 5304×7952 portrait", () => {
    const dims = getOrientedDimensions(5304, 7952, 1);
    expect(dims.width).toBe(5304);
    expect(dims.height).toBe(7952);
    expect(dims.isPortrait).toBe(true);
  });

  test("orientation 3: 5304×7952 portrait stays 5304×7952 portrait", () => {
    const dims = getOrientedDimensions(5304, 7952, 3);
    expect(dims.width).toBe(5304);
    expect(dims.height).toBe(7952);
    expect(dims.isPortrait).toBe(true);
  });

  test("orientation 6: stored as 7952×5304 landscape, native decode yields 5304×7952 portrait", () => {
    const dims = getOrientedDimensions(7952, 5304, 6);
    expect(dims.width).toBe(5304);
    expect(dims.height).toBe(7952);
    expect(dims.isPortrait).toBe(true);
  });

  test("orientation 8: stored as 7952×5304 landscape, native decode yields 5304×7952 portrait", () => {
    const dims = getOrientedDimensions(7952, 5304, 8);
    expect(dims.width).toBe(5304);
    expect(dims.height).toBe(7952);
    expect(dims.isPortrait).toBe(true);
  });
});

describe("Zero Hand-Rolled Matrix Regression Guard", () => {
  const rootDir = process.cwd();

  const targetFiles = [
    "src/lib/services/upload.service.ts",
    "src/lib/utils/watermark.ts",
    "src/lib/utils/compress-image.ts",
  ];

  test("no ctx.transform() or ctx.rotate() method calls exist in image processing files", () => {
    for (const relPath of targetFiles) {
      const fullPath = join(rootDir, relPath);
      const content = readFileSync(fullPath, "utf-8");

      expect(/\bctx\.transform\s*\(/.test(content)).toBe(false);
      expect(/\bctx\.rotate\s*\(/.test(content)).toBe(false);
      expect(content.includes("applyExifRotationTransform")).toBe(false);
    }
  });

  test("all image processing files use createImageBitmap with imageOrientation: 'from-image'", () => {
    for (const relPath of targetFiles) {
      const fullPath = join(rootDir, relPath);
      const content = readFileSync(fullPath, "utf-8");

      expect(content.includes('imageOrientation: "from-image"')).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Megapixel-Safe Canvas Scaling — computeCanvasDimensions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure JS reimplementation of computeCanvasDimensions — mirrors the logic in
 * canvas-utils.ts exactly.  Using a local copy keeps the test file runnable
 * without a browser environment (no DOM / ImageBitmap needed).
 */
function computeCanvasDimensionsLocal(
  srcW: number,
  srcH: number,
  maxSizePx = Infinity,
): { targetW: number; targetH: number; needsDownscale: boolean; outputRatio: number } {
  const SAFE = 16_000_000;
  const maxDim = Math.max(srcW, srcH);
  const totalPixels = srcW * srcH;

  let scale = 1.0;
  if (Number.isFinite(maxSizePx) && maxDim > maxSizePx) {
    scale = Math.min(scale, maxSizePx / maxDim);
  }
  if (totalPixels > SAFE) {
    scale = Math.min(scale, Math.sqrt(SAFE / totalPixels));
  }

  if (scale >= 1.0) {
    return { targetW: srcW, targetH: srcH, needsDownscale: false, outputRatio: srcW / srcH };
  }

  const ar = srcW / srcH;
  let targetW = Math.round(srcW * scale);
  let targetH = Math.round(targetW / ar);

  while (targetW * targetH > SAFE && targetW > 1) {
    targetW--;
    targetH = Math.round(targetW / ar);
  }

  return { targetW, targetH, needsDownscale: true, outputRatio: targetW / targetH };
}

describe("Megapixel-Safe Canvas Scaling — computeCanvasDimensions", () => {
  const SAFE_PIXELS = 16_000_000;
  const AR_TOLERANCE = 0.001; // 0.1 %

  interface MpCase {
    label: string;
    w: number;
    h: number;
    expectDownscale: boolean;
  }

  const cases: MpCase[] = [
    // ── Under budget — must NOT downscale ─────────────────────────────────────
    { label: "2MP  4:3  (1920×1080)",       w: 1920,  h: 1080,  expectDownscale: false },
    { label: "8MP  4:3  (3264×2448)",       w: 3264,  h: 2448,  expectDownscale: false },
    { label: "16MP square (4000×4000)",     w: 4000,  h: 4000,  expectDownscale: false },
    // ── Over budget — must downscale with AR preserved ────────────────────────
    { label: "24MP DSLR 3:2  (6000×4000)", w: 6000,  h: 4000,  expectDownscale: true  },
    { label: "48MP portrait (6048×8064)",  w: 6048,  h: 8064,  expectDownscale: true  },
    { label: "48MP landscape (8064×6048)", w: 8064,  h: 6048,  expectDownscale: true  },
    { label: "100MP square  (10000×10000)",w: 10000, h: 10000, expectDownscale: true  },
    { label: "200MP landscape (20000×10000)", w: 20000, h: 10000, expectDownscale: true },
    { label: "200MP ultra-wide (28284×7071)",w: 28284, h: 7071,  expectDownscale: true },
    { label: "200MP portrait  (10000×20000)",w: 10000, h: 20000, expectDownscale: true },
    { label: "200MP very-tall (4000×50000)", w: 4000,  h: 50000, expectDownscale: true },
  ];

  for (const c of cases) {
    test(`[${c.label}] — canvas within budget, AR preserved, no degenerate output`, () => {
      const inputRatio = c.w / c.h;
      const res = computeCanvasDimensionsLocal(c.w, c.h);

      // 1. Output dimensions must be positive integers
      expect(res.targetW).toBeGreaterThan(0);
      expect(res.targetH).toBeGreaterThan(0);

      // 2. Canvas must fit within the safe pixel budget
      expect(res.targetW * res.targetH).toBeLessThanOrEqual(SAFE_PIXELS);

      // 3. Aspect ratio must be preserved within 0.1 %
      const arDiff = Math.abs(res.outputRatio - inputRatio) / inputRatio;
      expect(arDiff).toBeLessThan(AR_TOLERANCE);

      // 4. Downscale flag must match expectation
      expect(res.needsDownscale).toBe(c.expectDownscale);
    });
  }

  // Boundary: exactly at the limit — no downscale needed
  test("16MP square (4000×4000) sits exactly at budget boundary — no downscale", () => {
    const res = computeCanvasDimensionsLocal(4000, 4000);
    expect(res.needsDownscale).toBe(false);
    expect(res.targetW).toBe(4000);
    expect(res.targetH).toBe(4000);
  });

  // One pixel over the boundary — must trigger downscale
  test("16MP+1px (4001×4000) just over budget — triggers downscale", () => {
    const res = computeCanvasDimensionsLocal(4001, 4000);
    expect(res.needsDownscale).toBe(true);
    expect(res.targetW * res.targetH).toBeLessThanOrEqual(SAFE_PIXELS);
  });

  // maxSizePx cap combined with pixel budget
  test("200MP + maxSizePx=1920: both constraints applied, stricter one wins", () => {
    const res = computeCanvasDimensionsLocal(20000, 10000, 1920);
    // maxSizePx=1920 on a 20000×10000 → scale = 1920/20000 = 0.096 → 1920×960
    expect(res.targetW).toBeLessThanOrEqual(1920);
    expect(res.targetH).toBeLessThanOrEqual(1920);
    expect(res.targetW * res.targetH).toBeLessThanOrEqual(SAFE_PIXELS);
    const arDiff = Math.abs(res.outputRatio - (20000 / 10000)) / (20000 / 10000);
    expect(arDiff).toBeLessThan(AR_TOLERANCE);
  });
});

import { isAllowedFile } from "@/lib/utils/upload-constants";
import { fillCanvasWhite, isCanvasDrawFailure } from "@/lib/utils/canvas-utils";
import * as exifModule from "@/lib/utils/exif-orientation";
import { applyWatermark } from "@/lib/utils/watermark";
import { compressImage } from "@/lib/utils/compress-image";

describe("Draw-Failure Pixel-Sampling Guard (isolated)", () => {
  test("shared canvas-utils exports fillCanvasWhite and isCanvasDrawFailure functions", () => {
    expect(typeof fillCanvasWhite).toBe("function");
    expect(typeof isCanvasDrawFailure).toBe("function");
  });

  /**
   * Refactored to test the real, imported `isCanvasDrawFailure` function from canvas-utils.ts
   * using a mock 2D context rather than maintaining a duplicate sampling loop in this file.
   */
  function testDrawFailureGuard(pixels: Uint8ClampedArray): boolean {
    const fakeCtx = {
      getImageData: () => ({ data: pixels }),
    } as unknown as CanvasRenderingContext2D;
    return isCanvasDrawFailure(fakeCtx, 10, 10);
  }

  test("all-transparent pixels → draw failure", () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(testDrawFailureGuard(pixels)).toBe(true);
  });

  test("all-solid-black pixels → draw failure", () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
    expect(testDrawFailureGuard(pixels)).toBe(true);
  });

  test("white pixel (255,255,255,255) → NOT a draw failure", () => {
    const pixels = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255,
                                          255, 255, 255, 255, 255, 255, 255, 255]);
    expect(testDrawFailureGuard(pixels)).toBe(false);
  });

  test("one non-black pixel among black pixels → NOT a draw failure (partial success)", () => {
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 128, 64, 32, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
    expect(testDrawFailureGuard(pixels)).toBe(false);
  });

  test("arbitrary colour (200,100,50,255) → NOT a draw failure", () => {
    const pixels = new Uint8ClampedArray([200, 100, 50, 255, 200, 100, 50, 255,
                                          200, 100, 50, 255, 200, 100, 50, 255]);
    expect(testDrawFailureGuard(pixels)).toBe(false);
  });
});

describe("Module Worker & Image Processing EXIF Fallback Wiring Integration", () => {
  test("[M13/M05] Module worker imports shared EXIF orientation utilities and handles fallback orientation matrix", async () => {
    const { getOrientationTransform, readJpegExifOrientation } = await import("@/lib/utils/exif-orientation");

    const dummyFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1])], "test.jpg", { type: "image/jpeg" });
    const orientation = await readJpegExifOrientation(dummyFile);
    expect(orientation).toBe(1);

    const portraitCase6 = getOrientationTransform(6, 4000, 3000);
    expect(portraitCase6.canvasW).toBe(3000);
    expect(portraitCase6.canvasH).toBe(4000);
    expect(typeof portraitCase6.applyTransform).toBe("function");

    const landscapeCase8 = getOrientationTransform(8, 4000, 3000);
    expect(landscapeCase8.canvasW).toBe(3000);
    expect(landscapeCase8.canvasH).toBe(4000);
    expect(typeof landscapeCase8.applyTransform).toBe("function");
  });

  // Helper setup for Canvas & ImageBitmap mocks
  function setupCanvasHarness(options: { nativeOrientation: boolean; exifOrientation: number }) {
    const saveSpy = mock();
    const restoreSpy = mock();
    const transformSpy = mock();
    const drawImageSpy = mock();
    const fillRectSpy = mock();

    const mockCtx = {
      fillStyle: "",
      fillRect: fillRectSpy,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      save: saveSpy,
      restore: restoreSpy,
      transform: transformSpy,
      drawImage: drawImageSpy,
      getImageData: () => ({
        data: new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),
      }),
      globalAlpha: 1.0,
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: (type: string) => (type === "2d" ? mockCtx : null),
      toBlob: (cb: (b: Blob | null) => void, mime: string) =>
        cb(new Blob([new Uint8Array([1, 2, 3])], { type: mime })),
    };

    // Spies on exif-orientation module
    const supportsSpy = spyOn(exifModule, "supportsImageOrientation").mockResolvedValue(options.nativeOrientation);
    const readExifSpy = spyOn(exifModule, "readJpegExifOrientation").mockResolvedValue(options.exifOrientation);

    // Mock globalThis.document & createImageBitmap
    const origDocument = globalThis.document;
    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      },
    };

    const origCreateImageBitmap = globalThis.createImageBitmap;
    globalThis.createImageBitmap = mock().mockResolvedValue({
      width: 4000,
      height: 3000,
      close: mock(),
    });

    // Mock HTMLImageElement for watermark loading
    const origImage = globalThis.Image;
    globalThis.Image = class MockImage {
      onload: () => void = () => {};
      src = "";
      crossOrigin = "";
      naturalWidth = 300;
      naturalHeight = 100;
      constructor() {
        setTimeout(() => this.onload(), 0);
      }
    } as any;

    return {
      saveSpy,
      restoreSpy,
      transformSpy,
      drawImageSpy,
      supportsSpy,
      readExifSpy,
      cleanup: () => {
        supportsSpy.mockRestore();
        readExifSpy.mockRestore();
        globalThis.document = origDocument;
        globalThis.createImageBitmap = origCreateImageBitmap;
        globalThis.Image = origImage;
      },
    };
  }

  test("[M05] watermark.ts fallback path: invokes ctx.save(), transform(), drawImage(), ctx.restore() when native orientation unsupported", async () => {
    const harness = setupCanvasHarness({ nativeOrientation: false, exifOrientation: 6 });
    try {
      const dummyFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1])], "portrait.jpg", { type: "image/jpeg" });
      const result = await applyWatermark(dummyFile, "http://example.com/watermark.png");

      expect(result).toBeInstanceOf(File);
      // Fallback path MUST execute save -> transform -> drawImage -> restore in that order
      expect(harness.saveSpy).toHaveBeenCalled();
      expect(harness.transformSpy).toHaveBeenCalledWith(0, 1, -1, 0, 3000, 0); // EXIF case 6 CW transform
      expect(harness.drawImageSpy).toHaveBeenCalled();
      expect(harness.restoreSpy).toHaveBeenCalled();
    } finally {
      harness.cleanup();
    }
  });

  test("[M05] watermark.ts native path: bypasses ctx.save()/transform when native orientation supported", async () => {
    const harness = setupCanvasHarness({ nativeOrientation: true, exifOrientation: 6 });
    try {
      const dummyFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1])], "portrait.jpg", { type: "image/jpeg" });
      const result = await applyWatermark(dummyFile, "http://example.com/watermark.png");

      expect(result).toBeInstanceOf(File);
      // Native path MUST NOT invoke save/transform fallback
      expect(harness.saveSpy).not.toHaveBeenCalled();
      expect(harness.transformSpy).not.toHaveBeenCalled();
      expect(harness.drawImageSpy).toHaveBeenCalled();
    } finally {
      harness.cleanup();
    }
  });

  test("[M05] compress-image.ts fallback path: invokes ctx.save(), transform(), drawImage(), ctx.restore() when native orientation unsupported", async () => {
    const harness = setupCanvasHarness({ nativeOrientation: false, exifOrientation: 8 });
    try {
      const dummyFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1])], "landscape.jpg", { type: "image/jpeg" });
      const result = await compressImage(dummyFile);

      expect(result).toBeInstanceOf(File);
      // Fallback path MUST execute save -> transform -> drawImage -> restore in that order
      expect(harness.saveSpy).toHaveBeenCalled();
      expect(harness.transformSpy).toHaveBeenCalledWith(0, -1, 1, 0, 0, 4000); // EXIF case 8 CCW transform
      expect(harness.drawImageSpy).toHaveBeenCalled();
      expect(harness.restoreSpy).toHaveBeenCalled();
    } finally {
      harness.cleanup();
    }
  });

  test("[M05] compress-image.ts native path: bypasses ctx.save()/transform when native orientation supported", async () => {
    const harness = setupCanvasHarness({ nativeOrientation: true, exifOrientation: 8 });
    try {
      const dummyFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1])], "landscape.jpg", { type: "image/jpeg" });
      const result = await compressImage(dummyFile);

      expect(result).toBeInstanceOf(File);
      // Native path MUST NOT invoke save/transform fallback
      expect(harness.saveSpy).not.toHaveBeenCalled();
      expect(harness.transformSpy).not.toHaveBeenCalled();
      expect(harness.drawImageSpy).toHaveBeenCalled();
    } finally {
      harness.cleanup();
    }
  });
});


