import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkPackage",
      required: true
    },

    action: String,
    status: String,
    comments: String,

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("WorkPackageHistory", historySchema);
