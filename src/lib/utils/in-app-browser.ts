/**
 * lib/utils/in-app-browser.ts
 * ─────────────────────────────────────────────────────────────────
 * Detects whether the page is running inside a restricted in-app
 * WebView (Instagram, Facebook, WhatsApp, Line, Twitter/X, TikTok,
 * Snapchat, WeChat etc.) where the native file picker's `multiple`
 * attribute is not honoured.
 *
 * WHY UA SNIFFING HERE:
 * There is no reliable feature-detection alternative for "am I inside
 * a restricted embedded WebView". In-app browsers deliberately present
 * themselves as Safari/Chrome to maximise compatibility, but they inject
 * proprietary UA tokens that identify them. This is one of the rare
 * cases where UA sniffing is the correct, industry-standard approach.
 *
 * COVERAGE:
 * These signatures cover the most common real-world cases. 100% coverage
 * across every in-app browser on every OS version is not achievable and
 * is explicitly out of scope. The goal is to warn the majority of users
 * who would otherwise silently experience single-file-only selection.
 */

export interface InAppBrowserResult {
  /** True if we believe the page is running in an in-app WebView */
  isInAppBrowser: boolean;
  /**
   * Human-readable name of the detected app, or null if not detected.
   * Used to personalise the warning banner ("Instagram's browser" etc.)
   */
  appName: string | null;
}

/**
 * Synchronous UA-based in-app browser detection.
 * Safe to call on every render — no side effects, no async work.
 * Returns { isInAppBrowser: false, appName: null } in any SSR context.
 */
export function detectInAppBrowser(): InAppBrowserResult {
  if (typeof navigator === "undefined") {
    return { isInAppBrowser: false, appName: null };
  }

  const ua = navigator.userAgent ?? "";

  // ── Facebook / Meta (Instagram, Facebook, Messenger) ─────────────────────
  // FBAN = Facebook app, FB_IAB = Facebook In-App Browser,
  // FBAV = Facebook app version, Instagram = Instagram app
  if (/FBAN|FBAV|FB_IAB|FBIOS|FBANDROID/i.test(ua)) {
    return { isInAppBrowser: true, appName: "Facebook" };
  }
  if (/Instagram/i.test(ua)) {
    return { isInAppBrowser: true, appName: "Instagram" };
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  if (/WhatsApp/i.test(ua)) {
    return { isInAppBrowser: true, appName: "WhatsApp" };
  }

  // ── Twitter / X ───────────────────────────────────────────────────────────
  if (/Twitter/i.test(ua)) {
    return { isInAppBrowser: true, appName: "X (Twitter)" };
  }

  // ── TikTok ────────────────────────────────────────────────────────────────
  if (/musical_ly|TikTok/i.test(ua)) {
    return { isInAppBrowser: true, appName: "TikTok" };
  }

  // ── Snapchat ──────────────────────────────────────────────────────────────
  if (/Snapchat/i.test(ua)) {
    return { isInAppBrowser: true, appName: "Snapchat" };
  }

  // ── Line ──────────────────────────────────────────────────────────────────
  if (/\bLine\b/i.test(ua)) {
    return { isInAppBrowser: true, appName: "Line" };
  }

  // ── WeChat ────────────────────────────────────────────────────────────────
  if (/MicroMessenger/i.test(ua)) {
    return { isInAppBrowser: true, appName: "WeChat" };
  }

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  if (/LinkedIn/i.test(ua)) {
    return { isInAppBrowser: true, appName: "LinkedIn" };
  }

  // ── Generic Android WebView (not Chrome, not Firefox, not Samsung)
  // Pattern: Android + Version/ present but "Chrome/" absent.
  // This catches generic in-app WebViews that don't have proprietary tokens.
  if (
    /Android/i.test(ua) &&
    /Version\/\d+\.\d+/.test(ua) &&
    !/Chrome\//i.test(ua) &&
    !/Firefox\//i.test(ua)
  ) {
    return { isInAppBrowser: true, appName: null };
  }

  return { isInAppBrowser: false, appName: null };
}

/**
 * Attempts to open the current URL in the system browser.
 *
 * Platform-specific strategies (no single method works everywhere):
 *  1. iOS Safari: intent:// URL scheme does not work; instead we use
 *     `window.location.href` with the bare URL, which prompts "Open in Safari"
 *     in most iOS in-app browsers when combined with an `_blank` target.
 *  2. Android Chrome intent: The android-app intent scheme opens Chrome directly.
 *  3. Fallback: Copy the current URL to clipboard so the user can paste it.
 *
 * This achieves reasonable coverage but 100% across all apps/OS versions
 * is not achievable. Some apps (WeChat on iOS) explicitly block all
 * system-browser-open attempts.
 */
export async function openInSystemBrowser(): Promise<"opened" | "copied" | "failed"> {
  const currentUrl = window.location.href;

  // ── Android: Chrome intent scheme ────────────────────────────────────────
  // Works in most Android in-app browsers to explicitly launch Chrome.
  const ua = navigator.userAgent ?? "";
  const isAndroid = /Android/i.test(ua);
  if (isAndroid) {
    try {
      // Android Chrome intent — the most reliable cross-app approach on Android
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      return "opened";
    } catch {
      // fall through to clipboard
    }
  }

  // ── iOS: open in a new blank context ─────────────────────────────────────
  // Most iOS in-app browsers present an "Open in Safari" button when they
  // see a window.open with target="_blank" that they can't handle.
  if (!isAndroid) {
    const newWin = window.open(currentUrl, "_blank", "noopener,noreferrer");
    if (newWin) return "opened";
    // If blocked (some in-app browsers block window.open), fall through
  }

  // ── Clipboard fallback ────────────────────────────────────────────────────
  try {
    await navigator.clipboard.writeText(currentUrl);
    return "copied";
  } catch {
    return "failed";
  }
}
