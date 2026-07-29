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

  // ── M01: iOS Share Sheet / WKWebView edge cases ─────────────────────────────
  // Real HEIC files from iOS Camera app passed through the share sheet or
  // WKWebView file picker arrive with type: "" and uppercase .HEIC extensions.
  // These MUST be accepted via the extension fallback — literal MIME-only check
  // would silently reject them, leaving the user with a "Unsupported type" error.

  test("[M01] iOS Camera HEIC: type '' + uppercase .HEIC extension is accepted", () => {
    // Simulates a real iPhone photo from iOS Camera / Photos app picker
    const file = new File([new Uint8Array([0, 0, 0, 1])], "IMG_5841.HEIC", { type: "" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("[M01] iOS Camera HEIC: type '' + lowercase .heic extension is accepted", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "img_5841.heic", { type: "" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("[M01] iOS HEIF: type '' + .heif extension is accepted", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "IMG_5841.HEIF", { type: "" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("[M01] HEIC with wrong MIME (non-image) but correct extension is accepted via extension fallback", () => {
    // Some Android in-app browsers misreport HEIC as application/octet-stream
    const file = new File([new Uint8Array([0, 0, 0, 1])], "photo.heic", { type: "application/octet-stream" });
    expect(isAllowedFile(file)).toBe(true);
  });

  test("[M01] non-image file with .heic-like name but wrong extension is rejected", () => {
    const file = new File([new Uint8Array([0, 0, 0, 1])], "document.heicx", { type: "" });
    expect(isAllowedFile(file)).toBe(false);
  });

  test("ALLOWED_FILE_EXTENSIONS includes .heic and .heif", () => {
    expect(ALLOWED_FILE_EXTENSIONS).toContain(".heic");
    expect(ALLOWED_FILE_EXTENSIONS).toContain(".heif");
  });
});
