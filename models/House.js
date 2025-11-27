import mongoose from "mongoose";

const houseSchema = new mongoose.Schema({
  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Village",
    required: true,
  },

  houseNumber: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    default: "",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // village officer user
    required: true,
  },

  membersCount: {
    type: Number,
    default: 0,
  },

  members: [
    {
      type: String,
    }
  ],

  surveyStatus: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model("House", houseSchema);
