import mongoose from "mongoose";

const projectRequestSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true
    },

    budget: {
      type: Number,
      required: true
    },

    description: {
      type: String
    },

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

    // Status flow controlled by collector
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    rejectionReason: {
      type: String
    },

    // NEW FIELD - Scheme Assignment (collector assigns after approval)
    assignedScheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scheme",
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("ProjectRequest", projectRequestSchema);
