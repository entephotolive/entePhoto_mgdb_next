import mongoose, { InferSchemaType, Model, Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    studioName: { type: String, trim: true },
    studioLocation: { type: String, trim: true },
    specialization: { type: String },
    specializations: { type: [String], default: [] },
    bio: { type: String },
    avatarUrl: { type: String },
    role: {
      type: String,
      default: "photographer",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };

/**
 * Industry-standard Next.js + Mongoose model registration.
 *
 * Problem: Next.js HMR re-evaluates modules but the Mongoose connection
 * (and its model registry) persists across hot reloads. If the schema changed
 * between reloads, the stale cached model silently strips new fields (strict mode).
 *
 * Fix: In development, always delete the cached model so the current schema
 * is compiled fresh on every module evaluation. In production, the process
 * starts once so the cache is always consistent.
 */
if (process.env.NODE_ENV === "development" && models.User) {
  mongoose.deleteModel("User");
}

export const UserModel: Model<UserDocument> =
  (models.User as Model<UserDocument>) ?? model<UserDocument>("User", userSchema);
