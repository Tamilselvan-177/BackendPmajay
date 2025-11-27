
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const surveySchema = new mongoose.Schema({
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "House",
    required: true,
  },

  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Village",
    required: true,
  },

  householdQuestions: [
    {
      indicatorId: String,
      domain: String,
      scheme: String,
      question: String,
      answer: {
        type: String,
        enum: ["yes", "no"],
        required: true
      },
      score: {
        type: Number,
        min: 1,
        max: 10,
        required: true
      },
      remark: String
    }
  ],

  infrastructureQuestions: [
    {
      indicatorId: String,
      domain: String,
      question: String,
      answer: {
        type: String,
        enum: ["yes", "no"],
        required: true
      },
      score: {
        type: Number,
        min: 1,
        max: 10,
        required: true
      },
      remark: String
    }
  ],

  surveyTakenBy: {
    name: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },

  members: [String],
  membersCount: Number,

  status: {
    type: String,
    default: "completed"
  },

  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model("Survey", surveySchema);
