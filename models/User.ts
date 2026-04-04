import { InferSchemaType, Model, Schema, model, models } from "mongoose";

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
    studioName: { type: String, trim: true },
    studioLocation: { type: String, trim: true },
    specialization: { type: String },
    specializations: { type: [String], default: [] },
    bio: { type: String },
    avatarUrl: { type: String },
    role: {
      type: String,
      enum: ["admin", "photographer"],
      default: "photographer",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };

export const UserModel =
  (models.User as Model<UserDocument>) || model<UserDocument>("User", userSchema);
