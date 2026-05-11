import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminModel } from "@/models/Admin";
import { getAuthCookieOptions, signSessionToken } from "@/lib/utils/auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        new URL("/admin/login?error=Google authentication failed.", request.url),
      );
    }

    const host = process.env.NEXT_PUBLIC_APP_URL;
    const redirectUri = `${host}/api/auth/callback/google/admin`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!host || !clientId || !clientSecret) {
      throw new Error("Google OAuth credentials are not configured.");
    }

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
      console.error("Admin token exchange error:", errData);
      throw new Error("Token exchange failed");
    }

    const tokens = await tokenResponse.json();
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

    await connectToDatabase();
    const adminEmail = googleUser.email.toLowerCase();
    const admin = await AdminModel.findOne({email:adminEmail});
    console.log(googleUser);
    console.log(adminEmail);
    console.log(admin);

    if (!admin) {
      return NextResponse.redirect(
        new URL(
          "/admin/login?error=You are not authorized to login as admin.",
          request.url,
        ),
      );
    }

    const token = await signSessionToken({
      sub: admin._id.toString(),
      name: admin.name,
      email: admin.email,
    });

    const response = NextResponse.redirect(`${host}/admin`);
    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error) {
    console.error("Admin Google Auth Error:", error);
    return NextResponse.redirect(
      new URL("/admin/login?error=Authentication error occurred.", request.url),
    );
  }
}
