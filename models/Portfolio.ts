import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const portfolioSchema = new Schema(
  {
    uploadedBy: {
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
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
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
