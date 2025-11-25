import Document from "../models/Document.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Village from "../models/Village.js";

// Utility: Validate district access
const verifyVillageAccess = async (villageId, collectorDistrict) => {
  const village = await Village.findById(villageId)
    .populate({
      path: "block",
      populate: { path: "district" }
    });

  if (!village) return false;
  return village.block.district._id.toString() === collectorDistrict.toString();
};

// Officer uploads document
export const uploadDocument = async (req, res) => {
  try {
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can upload documents" });
    }

    const { documentType } = req.body;
    const projectId = req.params.projectId;

    const project = await Project.findById(projectId).populate("village");
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Officer can only upload for their village project
    if (req.user.village.toString() !== project.village.toString()) {
      return res.status(403).json({ message: "Access denied: Not your project" });
    }

    const doc = await Document.create({
      projectId,
      documentType,
      fileName: req.file?.filename || null,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
      fileType: req.file?.mimetype,
      fileSize: req.file?.size,
      status: "pending",
      submittedBy: req.user._id,
      assignedCollector: req.user.assignedCollector,
      history: [
        {
          action: "submitted",
          performedBy: req.user._id,
          performedAt: new Date(),
          comments: "Document submitted"
        }
      ]
    });

    project.documents.push(doc._id);
    await project.save();

    res.status(201).json({ message: "Document uploaded", doc });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Collector reviews a document
export const reviewDocument = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can review documents" });
    }

    const { status, comments } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const doc = await Document.findById(req.params.id).populate("projectId");
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Security check: Is this project within collector district?
    const allowed = await verifyVillageAccess(doc.projectId.village, req.user.district);
    if (!allowed) {
      return res.status(403).json({ message: "Access blocked: Outside your district" });
    }

    doc.status = status;
    doc.reviewComments = comments;
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();

    doc.history.push({
      action: status,
      performedBy: req.user._id,
      performedAt: new Date(),
      comments
    });

    await doc.save();

    res.json({ success: true, message: "Document reviewed", doc });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Collector views assigned documents
export const getAssignedDocuments = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors allowed" });
    }

    const docs = await Document.find({ assignedCollector: req.user._id })
      .populate("submittedBy", "fullName email")
      .populate("projectId", "projectName village");

    // Filter by district security
    const filtered = [];
    for (const d of docs) {
      const ok = await verifyVillageAccess(d.projectId.village, req.user.district);
      if (ok) filtered.push(d);
    }

    res.json({ success: true, docs: filtered });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Officer views documents of a project
export const getProjectDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ projectId: req.params.projectId })
      .populate("submittedBy", "fullName")
      .populate("reviewedBy", "fullName");

    res.json({ success: true, docs });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
