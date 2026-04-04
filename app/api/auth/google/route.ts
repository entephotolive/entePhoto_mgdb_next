import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const host = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${host}/api/auth/callback/google`;

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { message: "Google Client ID is not configured." },
      { status: 500 }
    );
  }

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.append("client_id", clientId);
  googleAuthUrl.searchParams.append("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.append("response_type", "code");
  googleAuthUrl.searchParams.append("scope", "openid email profile");
  googleAuthUrl.searchParams.append("access_type", "online");
  // Pre-generate a state parameter here if we wanted CSRF protection, but for simplicity, we pass state="oauth"
  googleAuthUrl.searchParams.append("state", "oauth");

  return NextResponse.redirect(googleAuthUrl.toString());
}
