// models/VillageReadiness.js
import mongoose from "mongoose";

const villageReadinessSchema = new mongoose.Schema({
  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Village",
    required: true,
    unique: true
  },

  domainScores: {
    type: Map,
    of: {
      score: Number,
      maxScore: Number,
      percentage: Number,
      gap: Number
    }
  },

  overallReadiness: { type: Number, default: 0 }, 

  priority: {
    type: String,
    enum: ["critical", "high", "medium", "ready"],
    default: "medium"
  },

  color: {
    type: String,
    enum: ["red", "yellow", "green", "gray"],
    default: "gray"
  },

  topGaps: [
    {
      domain: String,
      gapPercentage: Number,
      gap: Number,
      suggestedBudget: Number
    }
  ],

  recommendedProjects: [
    {
      projectType: String,
      urgency: String,
      estimatedCost: Number,
      relatedScheme: String
    }
  ],

  totalSurveys: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("VillageReadiness", villageReadinessSchema);
