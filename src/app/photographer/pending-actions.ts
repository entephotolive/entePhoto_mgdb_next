"use server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { getCurrentSession } from "@/lib/services/auth.service";

/**
 * Updates the phone number for the currently logged-in photographer.
 *
 * Uses the MongoDB native driver (bypasses Mongoose strict-mode) to guarantee
 * the field is persisted regardless of model-cache state. This is the
 * industry-standard approach when writing fields that may not yet be reflected
 * in a cached Mongoose model.
 */
export async function updatePhotographerPhone(phoneNumber: string) {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Unauthorized – no active session found.");
  }

  const phone = phoneNumber.trim();
  if (!phone) {
    throw new Error("Phone number cannot be empty.");
  }

  const conn = await connectToDatabase();
  const collection = conn.connection.collection("users");

  const result = await collection.findOneAndUpdate(
    { email: session.email.toLowerCase() },
    {
      $set: {
        phoneNumber: phone,
        // Ensure isApproved exists as a field (backfill for legacy docs)
        isApproved: false,
      },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new Error(
      `User not found for email "${session.email}". ` +
        "Ensure the account was created before attempting a phone update."
    );
  }

  const savedPhone = result.phoneNumber as string | undefined;
  if (!savedPhone) {
    throw new Error(
      "Phone number was not persisted by the database. Please contact support."
    );
  }

  console.info(
    `[pending-actions] ✓ phoneNumber saved for ${session.email} → ${savedPhone}`
  );

  return { success: true, phoneNumber: savedPhone };
}

/**
 * Returns the pending approval info for the currently logged-in photographer.
 * Uses native driver to read fields that may be absent from a cached Mongoose model.
 */
export async function getPhotographerPendingInfo() {
  const session = await getCurrentSession();
  if (!session) return null;

  const conn = await connectToDatabase();
  const collection = conn.connection.collection("users");

  const user = await collection.findOne(
    { email: session.email.toLowerCase() },
    { projection: { isApproved: 1, phoneNumber: 1, name: 1, avatarUrl: 1 } }
  );

  if (!user) {
    console.warn(
      `[pending-actions] getPhotographerPendingInfo: no user found for ${session.email}`
    );
    return null;
  }

  return {
    isApproved: (user.isApproved as boolean | undefined) ?? false,
    phoneNumber: (user.phoneNumber as string | undefined) ?? null,
    name: user.name as string,
    avatarUrl: (user.avatarUrl as string | undefined) ?? null,
  };
}
