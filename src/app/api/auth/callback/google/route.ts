import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";
import { signSessionToken, getAuthCookieOptions } from "@/lib/utils/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    const host = process.env.NEXT_PUBLIC_APP_URL;

    if (!host) {
      throw new Error("NEXT_PUBLIC_APP_URL not set");
    }

    if (error || !code) {
      return NextResponse.redirect(`${host}/admin/login?error=Google authentication failed.`);
    }

    const redirectUri = `${host}/api/auth/callback/google`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials are not configured.");
    }

    // Exchange code → token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text();
      console.error("Token exchange error:", errData);
      throw new Error("Token exchange failed");
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const googleUser = await userResponse.json();

    if (!googleUser.email) {
      throw new Error("No email from Google");
    }

    // DB check
    await connectToDatabase();
    const email = googleUser.email.toLowerCase();

    const user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.redirect(`${host}/admin/login?error=Not authorized`);
    }

    // Create session
    const token = await signSessionToken({
      sub: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.redirect(`${host}/admin/dashboard`);

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;

  } catch (error) {
    console.error("Google Auth Error:", error);

    const host = process.env.NEXT_PUBLIC_APP_URL;
    return NextResponse.redirect(`${host}/admin/login?error=Authentication failed`);
  }
}
