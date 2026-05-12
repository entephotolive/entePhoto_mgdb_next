"use server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";

export async function fetchUsersPage(page: number, limit: number = 20) {
  await connectToDatabase();
  
  const skip = (page - 1) * limit;
  const users = await UserModel.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
  // Need to parse _id and dates to string for Client Components to avoid serialization errors
  return users.map(user => ({
    ...user,
    _id: user._id.toString(),
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : (user.createdAt ? new Date(user.createdAt).toISOString() : null),
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : (user.updatedAt ? new Date(user.updatedAt).toISOString() : null),
  }));
}
