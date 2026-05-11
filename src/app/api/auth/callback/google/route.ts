import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";
import { AdminModel } from "@/models/Admin";
import { signSessionToken, getAuthCookieOptions } from "@/lib/utils/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const stateStr = url.searchParams.get("state");

    let role = "photographer";
    try {
      if (stateStr) {
        const state = JSON.parse(stateStr);
        role = state.role || "photographer";
      }
    } catch (e) {
      console.error("Failed to parse state:", e);
    }

    const isAdmin = role === "admin";
    const loginPath = isAdmin ? "/admin/login" : "/photographer/login";
    const dashboardPath = isAdmin ? "/admin" : "/photographer/dashboard";

    if (error || !code) {
      return NextResponse.redirect(
        new URL(`${loginPath}?error=Google authentication failed.`, request.url)
      );
    }

    const host = process.env.NEXT_PUBLIC_APP_URL;
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

    // Fetch user profile
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const googleUser = await userResponse.json();
    if (!googleUser.email) {
      throw new Error("No email from Google");
    }

    await connectToDatabase();
    const email = googleUser.email.toLowerCase();

    let authenticatedUser = null;

    if (isAdmin) {
      authenticatedUser = await AdminModel.findOne({ email });
    } else {
      authenticatedUser = await UserModel.findOne({ email });
    }

    if (!authenticatedUser) {
      const authError = isAdmin 
        ? "You are not authorized to login as admin." 
        : "You are not authorized to login. contact admin";
      return NextResponse.redirect(
        new URL(`${loginPath}?error=${authError}`, request.url)
      );
    }

    // Create session
    const token = await signSessionToken({
      sub: authenticatedUser._id.toString(),
      name: authenticatedUser.name,
      email: authenticatedUser.email,
    });

    const response = NextResponse.redirect(`${host}${dashboardPath}`);
    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error) {
    console.error("Google Auth Error:", error);
    return NextResponse.redirect(
      new URL("/login?error=Authentication error occurred.", request.url)
    );
  }
}
