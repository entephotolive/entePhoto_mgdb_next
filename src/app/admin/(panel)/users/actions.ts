"use server";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongodb";

export type ApprovalFilter = "all" | "approved" | "pending";

/**
 * Fetch a page of users with optional approval filter.
 *
 * Uses the native MongoDB driver to correctly query the `isApproved` field
 * even on legacy documents where the field is absent (treated as falsy = pending).
 */
export async function fetchUsersPage(
  page: number,
  limit: number = 20,
  filter: ApprovalFilter = "all"
) {
  const conn = await connectToDatabase();
  const collection = conn.connection.collection("users");

  // Treat documents where isApproved is missing (undefined/null) as "pending"
  const query: Record<string, unknown> = {};
  if (filter === "approved") {
    query.isApproved = true;
  } else if (filter === "pending") {
    // Match documents where isApproved is false OR the field doesn't exist
    query.$or = [{ isApproved: false }, { isApproved: { $exists: false } }];
  }

  const skip = (page - 1) * limit;

  const users = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return users.map((user) => ({
    _id: user._id.toString(),
    name: user.name as string | undefined,
    email: user.email as string,
    avatarUrl: (user.avatarUrl as string | undefined) ?? null,
    phoneNumber: (user.phoneNumber as string | undefined) ?? null,
    studioName: (user.studioName as string | undefined) ?? null,
    studioLocation: (user.studioLocation as string | undefined) ?? null,
    specializations: (user.specializations as string[] | undefined) ?? [],
    isApproved: (user.isApproved as boolean | undefined) ?? false,
    provider: (user.provider as string | undefined) ?? "google",
    createdAt: user.createdAt
      ? new Date(user.createdAt as string | Date).toISOString()
      : null,
  }));
}

/**
 * Approve or revoke a photographer's access.
 * Uses native driver to guarantee the field is written correctly.
 */
export async function updateUserApproval(userId: string, isApproved: boolean) {
  const conn = await connectToDatabase();
  const collection = conn.connection.collection("users");

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { isApproved, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) throw new Error("User not found");

  return {
    success: true,
    isApproved: (result.isApproved as boolean | undefined) ?? false,
  };
}
