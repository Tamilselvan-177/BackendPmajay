import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: { type: mongoose.Schema.Types.ObjectId, ref: "District", required: true }
});

export default mongoose.model("Block", blockSchema);
