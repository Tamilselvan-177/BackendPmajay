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
      voiceUrl: String, // uploaded audio file
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model("Survey", surveySchema);
