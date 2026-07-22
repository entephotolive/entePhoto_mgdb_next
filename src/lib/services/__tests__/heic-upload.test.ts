// @ts-ignore
import { describe, expect, test } from "bun:test";
import { isAllowedFile, ALLOWED_FILE_EXTENSIONS } from "@/lib/utils/upload-constants";

describe("HEIC / HEIF Format Support & Validation", () => {
  test("accepts image/heic MIME type", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "photo.heic", { type: "image/heic" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("accepts image/heif MIME type", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "photo.heif", { type: "image/heif" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("accepts HEIC file with empty MIME type via extension fallback", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "IMG_0001.HEIC", { type: "" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("accepts HEIF file with generic application/octet-stream MIME type via extension fallback", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "IMG_0002.heif", { type: "application/octet-stream" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("rejects unsupported extensions and MIME types", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "document.pdf", { type: "application/pdf" });
    expect(isAllowedFile(file)).toBe(false);
  });
});
