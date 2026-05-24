import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  type: "bug" | "feedback";
  name: string;
  email: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: Date;
}

const ReportSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ["bug", "feedback"],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved"],
    default: "open",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Cast the cached model to the correct type to avoid union-type overload
// conflicts that TypeScript can't resolve when the two branches of
// `mongoose.models.X || mongoose.model<X>(...)` have incompatible signatures.
const ReportModel: Model<IReport> =
  (mongoose.models.Report as Model<IReport>) ||
  mongoose.model<IReport>("Report", ReportSchema, "bug_reports");

export default ReportModel;
