import mongoose from "mongoose";

const workPackageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },

    title: { type: String, required: true },
    amount: { type: Number, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignedCollector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    rejectionReason: String,

    documents: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WorkPackageDocument" }
    ],

    history: [
      { type: mongoose.Schema.Types.ObjectId, ref: "WorkPackageHistory" }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("WorkPackage", workPackageSchema);
