import mongoose, { InferSchemaType, Model, Schema, model, models } from "mongoose";

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    maxUses: {
      type: Number,
    },
    usesCount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export type CouponDocument = InferSchemaType<typeof couponSchema> & {
  _id: string | mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};


export const CouponModel: Model<CouponDocument> =
  (models.Coupon as Model<CouponDocument>) ?? model<CouponDocument>("Coupon", couponSchema);
