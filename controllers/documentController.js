// controllers/documentController.js
import Document from "../models/ProjectDocument.js";
import ProjectRequest from "../models/ProjectRequest.js";
import User from "../models/User.js";
import Village from "../models/Village.js";

const verifyVillageAccess = async (villageId, collectorDistrict) => {
  const village = await Village.findById(villageId).populate({
    path: "block",
    populate: { path: "district" }
  });

  return village?.block?.district?._id.toString() === collectorDistrict.toString();
};

// Officer uploads new document
export const uploadDocument = async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const projectRequest = await ProjectRequest.findById(requestId).populate("village");
    if (!projectRequest) return res.status(404).json({ message: "Project Request not found" });

    if (req.user.role !== "officer") return res.status(403).json({ message: "Only officers allowed" });

    if (req.user.village.toString() !== projectRequest.village.toString()) {
      return res.status(403).json({ message: "Access denied: Not your village" });
    }

    const doc = await Document.create({
      requestId,
      submittedBy: req.user._id,
      assignedCollector: req.user.assignedCollector,
      fileName: req.file?.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file?.mimetype,
      fileSize: req.file?.size,
      status: "pending"
    });

    projectRequest.documents.push(doc._id);
    await projectRequest.save();

    res.status(201).json({ success: true, message: "Document uploaded", doc });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Collector reviews document
export const reviewDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate("requestId");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (req.user.role !== "collector") return res.status(403).json({ message: "Collector only" });

    const allowed = await verifyVillageAccess(doc.requestId.village, req.user.district);
    if (!allowed) return res.status(403).json({ message: "Unauthorized district access" });

    const { status, comments } = req.body;

    doc.status = status;
    doc.reviewComments = comments;
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();

    res.json({ success: true, message: "Document reviewed", doc });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Collector sees assigned docs
export const getAssignedDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ assignedCollector: req.user._id })
      .populate("submittedBy", "fullName")
      .populate("requestId", "projectName village");

    res.json({ success: true, docs });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Officer view docs for specific request
export const getProjectDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ requestId: req.params.requestId })
      .populate("submittedBy", "fullName")
      .populate("reviewedBy", "fullName");

    res.json({ success: true, docs });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
