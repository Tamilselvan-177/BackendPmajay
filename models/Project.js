// models/Project.js (FIXED VERSION)
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true
    },
    budget: {
      type: Number,
      required: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: true
    },
    officerInCharge: {
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

    // Scheme assigned to this project
    assignedScheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scheme",
      default: null
    },

    // Optional base location for the project (shown on map even before verifications)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      },
      address: {
        type: String
      }
    },
    
    // VERIFICATION TRACKING FIELDS (NO DUPLICATES)
    verificationCount: {
      type: Number,
      default: 0
    },
    lastVerifiedAt: {
      type: Date,
      default: null
    },
    needsVerification: {
      type: Boolean,
      default: false
    },
    verificationOverdueDays: {
      type: Number,
      default: 0
    },
    currentProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    currentStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "delayed", "issues_found"],
      default: "not_started"
    },
    verificationFrequency: {
      type: String,
      enum: ["daily", "weekly", "biweekly", "monthly", "custom"],
      default: "weekly"
    },
    customFrequencyDays: {
      type: Number,
      min: 1,
      max: 365,
      default: 7
    }
  },
  { timestamps: true }
);

// ✅ SINGLE checkVerificationStatus METHOD (no duplicates)
projectSchema.methods.checkVerificationStatus = function() {
  if (!this.lastVerifiedAt) {
    this.needsVerification = true;
    this.verificationOverdueDays = Math.floor(
      (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)
    );
    return;
  }

  const frequencyDays = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    custom: this.customFrequencyDays || 7
  };

  const daysSinceLastVerification = Math.floor(
    (Date.now() - this.lastVerifiedAt) / (1000 * 60 * 60 * 24)
  );

  const requiredDays = frequencyDays[this.verificationFrequency] || 7;

  if (daysSinceLastVerification >= requiredDays) {
    this.needsVerification = true;
    this.verificationOverdueDays = daysSinceLastVerification - requiredDays;
  } else {
    this.needsVerification = false;
    this.verificationOverdueDays = 0;
  }
};

// ✅ SINGLE PRE-SAVE HOOK (no duplicates)
projectSchema.pre("save", function(next) {
  if (this.isModified("lastVerifiedAt") || this.isModified("verificationFrequency") || this.isNew) {
    this.checkVerificationStatus();
  }
  next();
});

export default mongoose.model("Project", projectSchema);
