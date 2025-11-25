import mongoose from "mongoose";

const villageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  block: { type: mongoose.Schema.Types.ObjectId, ref: "Block", required: true }
});

export default mongoose.model("Village", villageSchema);
