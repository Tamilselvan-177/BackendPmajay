// models/ProjectRequest.js
import mongoose from "mongoose";

const projectRequestSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    budget: { type: Number, required: true },
    description: String,

    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: true
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignedCollector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProjectDocument"
      }
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    rejectionReason: String
  },
  { timestamps: true }
);

export default mongoose.model("ProjectRequest", projectRequestSchema);
