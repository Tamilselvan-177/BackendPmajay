// models/Document.js (example)
import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  action: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt: Date,
  comments: String
});

const documentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  documentType: { type: String, required: true },
  fileName: String,
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reviewComments: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  history: [historySchema]
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
