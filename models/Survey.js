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

  // NEW STRUCTURE: TWO GROUPS OF QUESTIONS
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
      remark: String
    }
  ],

  // Who took the survey
  surveyTakenBy: {
    name: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },

  // Snapshot of house members at time of survey
  members: [String],
  membersCount: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    default: "completed"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Survey", surveySchema);
