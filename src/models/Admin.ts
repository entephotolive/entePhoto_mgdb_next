import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const adminSchema = new Schema(
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
    provider: {
      type: String,
      enum: ["google"],
      default: "google",
      required: true,
    },
    superAdmin: {
      type: Boolean,
      default: false,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export type AdminDocument = InferSchemaType<typeof adminSchema> & { _id: string };

export const AdminModel =
  (models.Admin as Model<AdminDocument>) || model<AdminDocument>("Admin", adminSchema);
