import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";
import { signSessionToken, getAuthCookieOptions } from "@/lib/utils/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(new URL("/login?error=Google authentication failed.", request.url));
    }

    const host = "https://entephoto.co.in";
    // VERY IMPORTANT: Use the exact NextAuth default callback URL structure here
    const redirectUri = `${host}/api/auth/callback/google`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials are not configured.");
    }

    // 1. Exchange the authorization code for an access token
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
      throw new Error("Failed to exchange token with Google.");
    }

    const tokens = await tokenResponse.json();

    // 2. Fetch the user's profile information
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user profile from Google.");
    }

    const googleUser = await userResponse.json();

    if (!googleUser.email) {
      throw new Error("No primary email returned from Google.");
    }

    // 3. Upsert into database
    await connectToDatabase();
    const email = googleUser.email.toLowerCase();

    let user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login?error=You are not authorized to login. contact admin", request.url));
    }

    const token = await signSessionToken({
      sub: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    // 5. Create redirect response and set the JWT auth cookie
    const response = NextResponse.redirect("https://entephoto.co.in/admin/dashboard");
    const cookieOptions = getAuthCookieOptions();

    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;

  } catch (error) {
    console.error("Google Auth Error:", error);
    return NextResponse.redirect(new URL("/login?error=Authentication error occurred.", request.url));
  }
}
