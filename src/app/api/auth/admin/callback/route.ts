import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AdminModel } from "@/models/Admin";
import { signSessionToken, getAuthCookieOptions } from "@/lib/utils/auth";
import { exchangeCodeForToken, fetchGoogleUserProfile } from "@/lib/utils/google-oauth";

const host = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${host}/api/auth/admin/callback`;
const LOGIN_URL = `${host}/admin/login`;
const DASHBOARD_URL = `${host}/admin`;

/**
 * GET /api/auth/admin/callback
 *
 * Handles the Google OAuth callback exclusively for admin users.
 *
 * Flow:
 *  1. Exchange authorization code → access token  (via shared helper)
 *  2. Fetch Google profile                        (via shared helper)
 *  3. Verify the email exists in AdminModel       (no auto-registration)
 *  4. Issue session JWT and redirect to dashboard
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        `${LOGIN_URL}?error=Google+authentication+failed.`
      );
    }

    // ── Step 1 & 2: OAuth exchange + profile (shared, no duplication) ──────
    const accessToken = await exchangeCodeForToken(code, REDIRECT_URI);
    const googleUser = await fetchGoogleUserProfile(accessToken);

    // ── Step 3: Verify admin exists (no self-registration allowed) ─────────
    await connectToDatabase();
    const admin = await AdminModel.findOne({ email: googleUser.email });

    if (!admin) {
      console.warn(`[admin/callback] Unauthorized login attempt: ${googleUser.email}`);
      return NextResponse.redirect(
        `${LOGIN_URL}?error=You+are+not+authorized+as+an+admin.`
      );
    }

    // ── Step 4: Issue session JWT ──────────────────────────────────────────
    const token = await signSessionToken({
      sub: admin._id.toString(),
      name: admin.name,
      email: admin.email,
    });

    const cookieOptions = getAuthCookieOptions();
    const response = NextResponse.redirect(DASHBOARD_URL);
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    console.info(`[admin/callback] Admin logged in: ${googleUser.email}`);
    return response;
  } catch (err) {
    console.error("[admin/callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${LOGIN_URL}?error=An+unexpected+error+occurred.`
    );
  }
}
