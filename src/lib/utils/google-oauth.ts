import { NextResponse } from "next/server";

/**
 * Shared Google OAuth utility functions.
 *
 * All duplicated OAuth plumbing (building the auth URL, exchanging the code,
 * fetching the user profile) lives here so the role-specific routes stay thin
 * and focused only on their own business logic.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture: string;
  id: string;
}

// ─── Build Google OAuth authorization URL ─────────────────────────────────────

/**
 * Constructs the Google OAuth 2.0 authorization URL for a given redirectUri.
 * Returns a NextResponse redirect or an error JSON response.
 */
export function buildGoogleAuthRedirect(redirectUri: string): NextResponse {
  const host = process.env.NEXT_PUBLIC_APP_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!host || !clientId) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: NEXT_PUBLIC_APP_URL or GOOGLE_CLIENT_ID is missing.",
      },
      { status: 500 }
    );
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account"); // Always show account picker

  return NextResponse.redirect(url.toString());
}

// ─── Exchange code → access token ─────────────────────────────────────────────

/**
 * Exchanges the OAuth authorization code for a Google access token.
 * Throws on failure so the caller's try/catch handles it uniformly.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${body}`);
  }

  const { access_token } = await res.json();
  return access_token as string;
}

// ─── Fetch Google user profile ─────────────────────────────────────────────────

/**
 * Fetches the authenticated user's profile from the Google userinfo endpoint.
 * Throws on failure so the caller's try/catch handles it uniformly.
 */
export async function fetchGoogleUserProfile(
  accessToken: string
): Promise<GoogleUserProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Google user profile.");
  }

  const data = await res.json();

  if (!data.email) {
    throw new Error("Google did not return an email address.");
  }

  return {
    email: (data.email as string).toLowerCase(),
    name: (data.name as string) || data.email,
    picture: (data.picture as string) || "",
    id: data.id as string,
  };
}
