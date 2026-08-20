import { connectToDatabase } from "@/lib/db/mongodb";
import { ProfileData } from "@/types";
import { ObjectId } from "bson";

// ── Error classes ─────────────────────────────────────────────────────────────

/** Thrown when the target user document does not exist in MongoDB. */
export class ProfileNotFoundError extends Error {
  constructor(userId: string) {
    super(`No profile found for user ID "${userId}".`);
    this.name = "ProfileNotFoundError";
  }
}

/** Thrown when the database connection or query itself fails. */
export class ProfileDbError extends Error {
  constructor(operation: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Database error during "${operation}": ${detail}`);
    this.name = "ProfileDbError";
  }
}

/** Thrown when the supplied userId string is not a valid ObjectId format. */
export class InvalidUserIdError extends Error {
  constructor(userId: string) {
    super(`The user ID "${userId}" is not a valid identifier.`);
    this.name = "InvalidUserIdError";
  }
}

// ── shared mapper ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDocToProfile(user: Record<string, any>): ProfileData {
  const phoneNumbers: string[] =
    Array.isArray(user.phoneNumbers) && user.phoneNumbers.length > 0
      ? (user.phoneNumbers as string[])
      : user.phoneNumber
      ? [user.phoneNumber as string]
      : [];

  return {
    id: user._id.toString(),
    name: (user.name as string) ?? "",
    email: (user.email as string) ?? "",
    studioName: (user.studioName as string) ?? "",
    studioLocation: (user.studioLocation as string) ?? "",
    specialization: (user.specialization as string) ?? "",
    specializations: Array.isArray(user.specializations)
      ? (user.specializations as string[])
      : [],
    bio: (user.bio as string) ?? "",
    avatarUrl: (user.avatarUrl as string) ?? "",
    phoneNumber: (user.phoneNumber as string) ?? (phoneNumbers[0] ?? ""),
    phoneNumbers,
    emails: Array.isArray(user.emails) ? (user.emails as string[]) : [],
    instagramUrl: (user.instagramUrl as string) ?? "",
    facebookUrl: (user.facebookUrl as string) ?? "",
  };
}

// ── safe ObjectId helper ──────────────────────────────────────────────────────
function tryObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// ─── fetchProfileById ─────────────────────────────────────────────────────────
/**
 * Fetch a photographer profile by userId.
 * Throws ProfileDbError on connection/query failure.
 * Returns null if the user document simply doesn't exist.
 */
export async function fetchProfileById(userId: string): Promise<ProfileData | null> {
  let conn;
  try {
    conn = await connectToDatabase();
  } catch (err) {
    throw new ProfileDbError("connectToDatabase", err);
  }

  const col = conn.connection.collection("users");
  const oid = tryObjectId(userId);
  const query = oid ? { _id: oid } : { _id: userId };

  let user;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user = await col.findOne(query as any);
  } catch (err) {
    throw new ProfileDbError("fetchProfileById.findOne", err);
  }

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapDocToProfile(user as Record<string, any>);
}

// ─── PatchProfileInput ────────────────────────────────────────────────────────
export interface PatchProfileInput {
  name?: string;
  studioName?: string;
  studioLocation?: string;
  specialization?: string;
  specializations?: string[];
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  phoneNumbers?: string[];
  emails?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
}

// ─── patchProfile ─────────────────────────────────────────────────────────────
/**
 * Partial-update a photographer's profile using the native MongoDB driver.
 *
 * Throws:
 *  - InvalidUserIdError  — if userId is not a valid 24-char hex ObjectId.
 *  - ProfileNotFoundError — if no document exists for that userId.
 *  - ProfileDbError       — if the DB connection or update query fails.
 */
export async function patchProfile(
  userId: string,
  data: PatchProfileInput
): Promise<ProfileData> {
  // ── Validate userId format ───────────────────────────────────────────────
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new InvalidUserIdError(userId);
  }

  const oid = tryObjectId(userId);
  if (!oid) {
    throw new InvalidUserIdError(userId);
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  let conn;
  try {
    conn = await connectToDatabase();
  } catch (err) {
    throw new ProfileDbError("connectToDatabase", err);
  }

  const col = conn.connection.collection("users");

  // ── Build $set payload ────────────────────────────────────────────────────
  // Only include fields explicitly provided (not undefined).
  // Empty string "" is valid — user intentionally cleared that field.
  const setFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      setFields[key] = value;
    }
  }

  // Keep legacy single phoneNumber in sync with phoneNumbers[0]
  if (data.phoneNumbers !== undefined) {
    setFields["phoneNumber"] = data.phoneNumbers[0] ?? "";
  }

  // Stamp updatedAt
  setFields["updatedAt"] = new Date();

  // ── Execute update ────────────────────────────────────────────────────────
  let userDoc;
  try {
    userDoc = await col.findOneAndUpdate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _id: oid } as any,
      { $set: setFields },
      { returnDocument: "after" }
    );
  } catch (err) {
    console.error(`[patchProfile] DB update failed for userId="${userId}":`, err);
    throw new ProfileDbError("patchProfile.findOneAndUpdate", err);
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!userDoc) {
    console.error(
      `[patchProfile] No document matched _id="${oid.toString()}". ` +
        `The account may have been deleted or the session userId is stale.`
    );
    throw new ProfileNotFoundError(userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapDocToProfile(userDoc as Record<string, any>);
}
