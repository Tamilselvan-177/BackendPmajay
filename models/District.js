import mongoose from "mongoose";

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true }
});

export default mongoose.model("District", districtSchema);
