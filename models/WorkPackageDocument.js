import mongoose from "mongoose";

const workPackageDocumentSchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkPackage", required: true },

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

    reviewComments: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("WorkPackageDocument", workPackageDocumentSchema);
