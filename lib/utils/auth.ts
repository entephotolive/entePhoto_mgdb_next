import bcrypt from "bcryptjs";
import { JWTPayload, SignJWT, jwtVerify } from "jose";
import { authCookieName } from "@/lib/utils/constants";

const encoder = new TextEncoder();

interface SessionToken extends JWTPayload {
  sub: string;
  name: string;
  email: string;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return encoder.encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: Omit<SessionToken, "iat" | "exp">) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify<SessionToken>(token, getJwtSecret());
  return payload;
}

export function getAuthCookieOptions() {
  return {
    name: authCookieName,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
