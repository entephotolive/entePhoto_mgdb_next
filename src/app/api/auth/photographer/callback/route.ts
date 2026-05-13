import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { signSessionToken, getAuthCookieOptions } from "@/lib/utils/auth";
import { exchangeCodeForToken, fetchGoogleUserProfile } from "@/lib/utils/google-oauth";

const host = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${host}/api/auth/photographer/callback`;
const LOGIN_URL = `${host}/photographer/login`;
const DASHBOARD_URL = `${host}/photographer/dashboard`;

/**
 * GET /api/auth/photographer/callback
 *
 * Handles the Google OAuth callback exclusively for photographer users.
 *
 * Flow:
 *  1. Exchange authorization code → access token  (via shared helper)
 *  2. Fetch Google profile                        (via shared helper)
 *  3. Find or auto-create the photographer in MongoDB (native driver,
 *     bypasses Mongoose model-cache issues from Next.js HMR)
 *     - New users: isApproved: false, role: "photographer"
 *     - Existing users: backfill any missing fields (isApproved, avatarUrl)
 *  4. Issue session JWT
 *  5. Redirect based on approval status:
 *     - Not approved → /photographer/login?pending=true  (session still set
 *       so the phone-update server action can identify the user)
 *     - Approved     → /photographer/dashboard
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

    // ── Step 3: Find or auto-create photographer ───────────────────────────
    const conn = await connectToDatabase();
    const usersCol = conn.connection.collection("users");

    let userDoc = await usersCol.findOne({ email: googleUser.email });

    if (!userDoc) {
      // Brand-new photographer → register with isApproved: false
      const { insertedId } = await usersCol.insertOne({
        name: googleUser.name,
        email: googleUser.email,
        provider: "google",
        avatarUrl: googleUser.picture,
        isApproved: false,
        specializations: [],
        role: "photographer",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userDoc = await usersCol.findOne({ _id: insertedId });
      console.info(`[photographer/callback] New photographer registered: ${googleUser.email}`);
    } else {
      // Existing user → backfill any fields absent in legacy documents
      const patch: Record<string, unknown> = {};
      if (userDoc.isApproved === undefined || userDoc.isApproved === null) {
        patch.isApproved = false;
      }
      if (!userDoc.avatarUrl && googleUser.picture) {
        patch.avatarUrl = googleUser.picture;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = new Date();
        await usersCol.updateOne({ email: googleUser.email }, { $set: patch });
        userDoc = await usersCol.findOne({ email: googleUser.email });
        console.info(
          `[photographer/callback] Backfilled fields for ${googleUser.email}:`,
          Object.keys(patch)
        );
      }
    }

    if (!userDoc) {
      throw new Error("Failed to retrieve user document after create/update.");
    }

    // ── Step 4: Issue session JWT ──────────────────────────────────────────
    const token = await signSessionToken({
      sub: userDoc._id.toString(),
      name: userDoc.name as string,
      email: userDoc.email as string,
    });

    const cookieOptions = getAuthCookieOptions();
    const isApproved = (userDoc.isApproved as boolean | undefined) ?? false;

    // ── Step 5: Redirect based on approval status ──────────────────────────
    if (!isApproved) {
      const response = NextResponse.redirect(`${LOGIN_URL}?pending=true`);
      response.cookies.set(cookieOptions.name, token, cookieOptions);
      console.info(`[photographer/callback] Unapproved — pending: ${googleUser.email}`);
      return response;
    }

    const response = NextResponse.redirect(DASHBOARD_URL);
    response.cookies.set(cookieOptions.name, token, cookieOptions);
    console.info(`[photographer/callback] Approved — logged in: ${googleUser.email}`);
    return response;
  } catch (err) {
    console.error("[photographer/callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${LOGIN_URL}?error=An+unexpected+error+occurred.`
    );
  }
}
