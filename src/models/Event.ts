import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    photoCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export type EventDocument = InferSchemaType<typeof eventSchema> & { _id: string };

export const EventModel =
  (models.Event as Model<EventDocument>) || model<EventDocument>("Event", eventSchema);
