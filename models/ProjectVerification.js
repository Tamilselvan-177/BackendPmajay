// models/ProjectVerification.js
import mongoose from "mongoose";

const projectVerificationSchema = new mongoose.Schema(
  {
    // Link to the approved project
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },

    // Link to original project request (for easier tracking)
    projectRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectRequest",
      required: true
    },

    
    // Who verified (Officer/Collector)
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Photo of current progress
    photo: {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      fileSize: { type: Number },
      fileType: { type: String }
    },

    // Description of current status
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },

    // Progress percentage (optional - officer can estimate)
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    // GPS Location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      },
      address: String // Optional human-readable address
    },

    // Status of work observed
    workStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "delayed", "issues_found"],
      default: "in_progress"
    },

    // Any issues/concerns noted
    issues: {
      type: String,
      maxlength: 500
    },

    // Verification number (auto-increment for this project)
    verificationNumber: {
      type: Number,
      required: true
    }
  },
  { 
    timestamps: true // createdAt, updatedAt
  }
);

// Index for geospatial queries
projectVerificationSchema.index({ location: "2dsphere" });

// Index for faster queries
projectVerificationSchema.index({ project: 1, createdAt: -1 });
projectVerificationSchema.index({ projectRequest: 1, createdAt: -1 });
projectVerificationSchema.index({ verifiedBy: 1 });

export default mongoose.model("ProjectVerification", projectVerificationSchema);