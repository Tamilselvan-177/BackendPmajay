// models/Project.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: true
    },

    budget: { type: Number, required: true },
    expenditure: { type: Number, default: 0 },

    statuses: {
      requesting: { type: String, default: "pending" },
      acknowledgement: { type: String, default: "pending" },
      fundsAllocated: { type: String, default: "pending" },
      workAssigned: { type: String, default: "pending" },
      workInProgress: {
        status: { type: String, default: "pending" },
        percentage: { type: Number, default: 0 }
      },
      completed: { type: String, default: "pending" }
    },

    documents: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ProjectDocument" }
    ],

    officerInCharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
