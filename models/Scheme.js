import mongoose from "mongoose";

const schemeSchema = new mongoose.Schema(
  {
    schemeName: { type: String, required: true },
    description: String,
    budgetLimit: Number,
    guidelinesUrl: String,
  },
  { timestamps: true }
);

export default mongoose.model("Scheme", schemeSchema);
