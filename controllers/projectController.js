// controllers/projectController.js
import ProjectRequest from "../models/ProjectRequest.js";
import Project from "../models/Project.js";
import Village from "../models/Village.js";
import ProjectDocument from "../models/ProjectDocument.js";

// Utility: Check village inside collector district
const verifyVillageAccess = async (villageId, collectorDistrict) => {
  const village = await Village.findById(villageId)
    .populate({
      path: "block",
      populate: { path: "district" }
    });

  if (!village) return false;
  return village.block.district._id.toString() === collectorDistrict.toString();
};

// =========================================
// OFFICER: Create Project Request + Upload documents
// =========================================
export const createProjectRequest = async (req, res) => {
  try {
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can request projects" });
    }

    const { projectName, budget, description } = req.body;

    const villageId = req.user.village;   // 🔥 Auto fetch from logged-in officer
    const assignedCollector = req.user.assignedCollector;

    if (!villageId) {
      return res.status(400).json({ message: "Village not linked with officer" });
    }

    // Create project request
    const request = await ProjectRequest.create({
      projectName,
      budget,
      description,
      village: villageId,
      requestedBy: req.user._id,
      assignedCollector
    });

    // Handle file uploads if available
    if (req.files && req.files.length > 0) {
      const docs = await Promise.all(
        req.files.map(file =>
          ProjectDocument.create({
            requestId: request._id,
            documentType: "supporting",
            fileName: file.filename,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size
          })
        )
      );

      request.documents.push(...docs.map(d => d._id));
      await request.save();
    }

    res.status(201).json({
      success: true,
      message: "Project request submitted successfully",
      request
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =========================================
// COLLECTOR: View Requests Assigned to Him (District restricted)
// =========================================
export const getCollectorRequests = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can view requests" });
    }

    // Find villages under collector district
    const villages = await Village.find()
      .populate({
        path: "block",
        populate: { path: "district" }
      });

    const allowedVillages = villages
      .filter(v => v.block.district._id.toString() === req.user.district.toString())
      .map(v => v._id.toString());

    const requests = await ProjectRequest.find({
      village: { $in: allowedVillages },
      assignedCollector: req.user._id
    })
      .populate("requestedBy", "fullName email")
      .populate("village", "name block district state")
      .populate({
        path: "documents",
        model: "ProjectDocument",
        select: "documentType fileUrl status reviewComments reviewedAt"
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =====================================
// COLLECTOR: Review Individual Document
// =====================================
export const reviewProjectDocument = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can review documents" });
    }

    const { decision, comments } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approved or rejected" });
    }

    const doc = await ProjectDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const request = await ProjectRequest.findById(doc.requestId);
    if (!request) return res.status(404).json({ message: "Parent request not found" });

    // Security: Check district access
    const allowed = await verifyVillageAccess(request.village, req.user.district);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied: Village not under your district" });
    }

    doc.status = decision;
    doc.reviewComments = comments;
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();

    res.json({ success: true, message: "Document reviewed", doc });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =====================================
// COLLECTOR: Approve / Reject Request
// =====================================
export const reviewProjectRequest = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can review requests" });
    }

    const request = await ProjectRequest.findById(req.params.requestId)
      .populate("documents");

    if (!request) return res.status(404).json({ message: "Request not found" });

    // Security: Validate district ownership
    const allowed = await verifyVillageAccess(request.village, req.user.district);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied: Village is outside district" });
    }

    const { decision, reason } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approved or rejected" });
    }

    if (decision === "rejected") {
      request.status = "rejected";
      request.rejectionReason = reason;
      await request.save();
      return res.json({ success: true, message: "Request rejected", request });
    }

    const docs = await ProjectDocument.find({ _id: { $in: request.documents } });
    const unapproved = docs.filter(doc => doc.status !== "approved");

    if (unapproved.length > 0) {
      return res.status(400).json({ message: "All documents must be approved first" });
    }

    request.status = "approved";
    await request.save();

    const project = await Project.create({
      projectName: request.projectName,
      budget: request.budget,
      village: request.village,
      officerInCharge: request.requestedBy,
      documents: request.documents
    });

    res.json({ success: true, message: "Project approved & created", project });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================================
// OFFICER: View Their Own Requests
// =====================================
export const getMyRequests = async (req, res) => {
  try {
    const requests = await ProjectRequest.find({ requestedBy: req.user._id })
      .populate("village", "name block district state")
      .populate({
        path: "documents",
        model: "ProjectDocument",
        select: "documentType fileUrl status"
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
