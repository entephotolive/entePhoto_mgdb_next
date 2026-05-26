import { buildGoogleAuthRedirect } from "@/lib/utils/google-oauth";

/**
 * GET /api/auth/admin
 *
 * Initiates Google OAuth for admin login.
 * The redirect_uri is admin-specific so the callback needs no role detection.
 */
export function GET() {
  const host = process.env.NEXT_PUBLIC_APP_URL!;
  return buildGoogleAuthRedirect(`${host}/api/auth/admin/callback`);
}
