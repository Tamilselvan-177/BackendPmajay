// models/Survey.js - REPLACE COMPLETELY
import mongoose from "mongoose";
import indicatorSchema from "./indicatorSchema.js";
import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";
import { computeDomainScores } from "../utils/scoring.js";

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
  indicators: [indicatorSchema],  // ✅ NEW STRUCTURE
  domainScores: { 
    type: Map, 
    of: Number  // domainKey: score
  },
  overallScore: { type: Number, default: 0 },
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

// Auto-compute scores BEFORE saving
surveySchema.pre('save', function(next) {
  if (this.isModified('indicators')) {
    const scores = computeDomainScores(this.indicators);
    this.domainScores = scores;
    this.overallScore = Object.values(scores).reduce((a, b) => a + b, 0);
  }
  next();
});

export default mongoose.model("Survey", surveySchema);
5