// @ts-ignore
import { describe, expect, test } from "bun:test";
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
