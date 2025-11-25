import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    role: {
      type: String,
      enum: ["primeminister", "collector", "officer"],
      default: "officer",
    },

    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, trim: true },

    // -------------------------------
    // Location Foreign Keys (ObjectId)
    // -------------------------------
    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: function () {
        return this.role === "collector" || this.role === "officer";
      }
    },

    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: function () {
        return this.role === "collector" || this.role === "officer";
      }
    },

    block: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Block",
      required: function () {
        return this.role === "officer";
      }
    },

    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: function () {
        return this.role === "officer";
      }
    },

    // -------------------------------
    // Relation to assigned Collector
    // -------------------------------
    assignedCollector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "officer";
      }
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password verification
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
