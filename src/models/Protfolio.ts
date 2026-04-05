import { Schema, model, models, InferSchemaType, Model } from "mongoose";

const portfolioSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String, // Cloudinary public_id (important for delete)
      required: true,
    },
   
  },
  {
    timestamps: true,
  }
);

export type PortfolioDocument = InferSchemaType<typeof portfolioSchema> & {
  _id: string;
};

export const PortfolioModel =
  (models.Portfolio as Model<PortfolioDocument>) ||
  model<PortfolioDocument>("Portfolio", portfolioSchema);