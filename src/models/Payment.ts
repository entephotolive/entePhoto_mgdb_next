import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const paymentSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    serviceType: {
      type: String,
      enum: ["self", "managed"],
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventTitle: {
      type: String,
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & { _id: string | Types.ObjectId };

export const PaymentModel =
  (models.Payment as Model<PaymentDocument>) || model<PaymentDocument>("Payment", paymentSchema);
