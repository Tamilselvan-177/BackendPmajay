import mongoose from "mongoose";

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

  questions: [
    {
      questionNumber: Number,
      questionText: String,

      answer: {
        type: String,
        enum: ["yes", "no", "partial", "na"], 
        required: true,
      },

      remark: {
        type: String,
      },

      // FIXED: Changed from audioUrl to voiceUrl to match controller
      voiceUrl: {
        type: String,
      }
    }
  ],

  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model("Survey", surveySchema);