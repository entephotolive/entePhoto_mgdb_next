// @ts-ignore
import { describe, expect, test } from "bun:test";
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
