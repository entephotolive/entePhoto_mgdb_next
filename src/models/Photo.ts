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
    uploadedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export type PhotoDocument = InferSchemaType<typeof photoSchema> & { _id: string };

export const PhotoModel =
  (models.Photo as Model<PhotoDocument>) || model<PhotoDocument>("Photo", photoSchema);
