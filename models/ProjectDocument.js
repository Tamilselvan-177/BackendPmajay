// models/ProjectDocument.js
import mongoose from "mongoose";

const projectDocumentSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectRequest",
      required: true
    },

    documentType: { type: String, required: true },

    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    reviewComments: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("ProjectDocument", projectDocumentSchema);
