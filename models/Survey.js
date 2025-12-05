// models/Survey.js
import mongoose from "mongoose";
import indicatorSchema from "./indicatorSchema.js";
import { computeIndicatorScore, computeDomainScores } from "../utils/scoring.js";

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

  indicators: [indicatorSchema],   // each indicator has score, question, domain, answer…

  domainScores: {
    type: Map,
    of: Number, // domainKey → score
    default: {}
  },

  overallScore: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending"
  },

  surveyTakenBy: {
    name: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },

  members: [String],
  membersCount: Number,

  createdAt: { type: Date, default: Date.now }
});


// ---------------------------------------------------------------
// AUTO SCORING BEFORE SAVE
// ---------------------------------------------------------------
surveySchema.pre("save", function (next) {

  // Only recompute when indicators change
  if (this.isModified("indicators")) {

    // 1️⃣ Compute each indicator score
    this.indicators = this.indicators.map(ind => {
      ind.score = computeIndicatorScore(ind);
      return ind;
    });

    // 2️⃣ Compute domain totals
    const domainScores = computeDomainScores(this.indicators);
    this.domainScores = domainScores;

    // 3️⃣ Total → overall score
    this.overallScore = Object.values(domainScores).reduce((a, b) => a + b, 0);
  }

  next();
});

export default mongoose.model("Survey", surveySchema);
