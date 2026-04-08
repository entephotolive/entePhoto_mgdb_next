import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const folderSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
  },
  photoCount: { type: Number, default: 0 },

  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export type FolderModel = InferSchemaType<typeof folderSchema> & {
  _id: string;
};

export const FolderModel =
  (models.Folder as Model<FolderModel>) ||
  model<FolderModel>("Folder", folderSchema);
