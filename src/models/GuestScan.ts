import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const guestScanSchema = new Schema(
  {
    eventId: {
      type: Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    attendeeId: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type GuestScanDocument = InferSchemaType<typeof guestScanSchema> & {
  _id: string;
};

export const GuestScanModel =
  (models.GuestScan as Model<GuestScanDocument>) ||
  model<GuestScanDocument>("GuestScan", guestScanSchema, "guest_scans");
