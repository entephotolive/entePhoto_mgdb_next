import { buildGoogleAuthRedirect } from "@/lib/utils/google-oauth";

/**
 * GET /api/auth/photographer
 *
 * Initiates Google OAuth for photographer login.
 * The redirect_uri is photographer-specific so the callback needs no role detection.
 */
export function GET() {
  const host = process.env.NEXT_PUBLIC_APP_URL!;
  return buildGoogleAuthRedirect(`${host}/api/auth/photographer/callback`);
}
