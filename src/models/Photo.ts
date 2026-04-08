import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const photoSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    eventId: {
      type: Types.ObjectId,
      ref: "Event",
      required: true,
    },
    folderId: {
      type: Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    uploadedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

export type PhotoDocument = InferSchemaType<typeof photoSchema> & { _id: string };

export const PhotoModel =
  (models.Photo as Model<PhotoDocument>) || model<PhotoDocument>("Photo", photoSchema);
