const FALLBACK_SITE_URL = process.env.NEXT_PUBLIC_APP_URL;

function normalizeSiteUrl(value?: string | null) {
  if (!value) {
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(value);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return FALLBACK_SITE_URL;
    }

    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL);
export const siteName = "Ente Photo";
export const supportEmail = "entephoto.live@gmail.com";
export const defaultOgImage = "/logo.jpeg";
