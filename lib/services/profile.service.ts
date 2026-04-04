import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";
import { ProfileData } from "@/types";

export async function fetchProfileById(userId: string): Promise<ProfileData | null> {
  await connectToDatabase();

  const user = await UserModel.findById(userId).lean();

  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    studioName: user.studioName ?? "",
    studioLocation: user.studioLocation ?? "",
    specialization: user.specialization ?? "",
    specializations: user.specializations ?? [],
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
  };
}

export interface PatchProfileInput {
  name?: string;
  studioName?: string;
  studioLocation?: string;
  specialization?: string;
  specializations?: string[];
  bio?: string;
  avatarUrl?: string;
}

export async function patchProfile(
  userId: string,
  data: PatchProfileInput
): Promise<ProfileData | null> {
  await connectToDatabase();

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true }
  ).lean();

  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    studioName: user.studioName ?? "",
    studioLocation: user.studioLocation ?? "",
    specialization: user.specialization ?? "",
    specializations: user.specializations ?? [],
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
  };
}
