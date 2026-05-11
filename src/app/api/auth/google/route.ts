import { NextResponse } from "next/server";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "photographer";
  
  const host = process.env.NEXT_PUBLIC_APP_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!host || !clientId) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }

  // Use a single callback URI for all roles
  const redirectUri = `${host}/api/auth/callback/google`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  googleAuthUrl.searchParams.append("client_id", clientId);
  googleAuthUrl.searchParams.append("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.append("response_type", "code");
  googleAuthUrl.searchParams.append("scope", "openid email profile");
  googleAuthUrl.searchParams.append("access_type", "online");
  
  // Pass the role in the state parameter
  googleAuthUrl.searchParams.append("state", JSON.stringify({ role }));

  return NextResponse.redirect(googleAuthUrl.toString());
}
