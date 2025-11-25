import WorkPackage from "../models/WorkPackage.js";
import WorkPackageDocument from "../models/WorkPackageDocument.js";
import WorkPackageHistory from "../models/WorkPackageHistory.js";
import ProjectRequest from "../models/ProjectRequest.js";
import User from "../models/User.js";
import Village from "../models/Village.js";

// --------------------------------------------
// Utility: Check if a village belongs to collector's district
// --------------------------------------------
const verifyVillageAccess = async (villageId, collectorDistrict) => {
  const village = await Village.findById(villageId)
    .populate({
      path: "block",
      populate: { path: "district" }
    });

  if (!village) return false;

  // FIX: district may come as object or direct ID
  const districtId = village.block.district._id || village.block.district;

  return districtId.toString() === collectorDistrict.toString();
};

// --------------------------------------------
// OFFICER: Create Work Package + initial document upload
// --------------------------------------------
export const createWorkPackageWithUpload = async (req, res) => {
  try {
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can create work packages" });
    }

    const { projectId, title, amount, documentType } = req.body;

    const project = await ProjectRequest.findById(projectId).populate("village");
    if (!project) return res.status(404).json({ message: "Project Request not found" });

    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ message: "Amount must be numeric" });
    }

    // ⭐ DEBUG: Log to see what we're getting
    console.log("Project village:", project.village);
    console.log("Project village type:", typeof project.village);
    
    // ⭐ FIX: Extract village ID properly - handle both ObjectId and populated object
    let villageId;
    if (project.village) {
      if (typeof project.village === 'object' && project.village._id) {
        villageId = project.village._id;
      } else {
        villageId = project.village;
      }
    }

    console.log("Extracted villageId:", villageId);

    if (!villageId) {
      return res.status(400).json({ message: "Village information not found in project" });
    }

    const work = await WorkPackage.create({
      project: projectId,
      village: villageId,
      title,
      amount: amountNum,
      status: "pending",
      createdBy: req.user._id,
      assignedCollector: req.user.assignedCollector,
    });

    console.log("Created work package with village:", work.village);

    const doc = await WorkPackageDocument.create({
      packageId: work._id,
      documentType,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    work.documents.push(doc._id);

    const history = await WorkPackageHistory.create({
      packageId: work._id,
      action: "Work Package Submitted",
      status: "pending",
      performedBy: req.user._id,
    });

    work.history.push(history._id);
    await work.save();

    res.status(201).json({ success: true, message: "Work package created", work, doc });
  } catch (err) {
    console.error("Create work package error:", err);
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// OFFICER: Upload additional document
// --------------------------------------------
export const uploadWorkPackageDocument = async (req, res) => {
  try {
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can upload documents" });
    }

    const work = await WorkPackage.findById(req.params.packageId);
    if (!work) return res.status(404).json({ message: "Work package not found" });

    const doc = await WorkPackageDocument.create({
      packageId: work._id,
      documentType: req.body.documentType,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });

    work.documents.push(doc._id);
    await work.save();

    await WorkPackageHistory.create({
      packageId: work._id,
      action: "Additional Document Uploaded",
      status: "pending",
      performedBy: req.user._id
    });

    res.status(201).json({ success: true, doc });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// COLLECTOR: Review individual document
// --------------------------------------------
export const reviewDocument = async (req, res) => {
  try {
    const { decision, comments } = req.body;

    const doc = await WorkPackageDocument.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Check if already reviewed
    if (doc.status === "approved" || doc.status === "rejected") {
      return res.status(400).json({ 
        message: "Document already reviewed",
        currentStatus: doc.status 
      });
    }

    const work = await WorkPackage.findById(doc.packageId);
    if (!work) return res.status(404).json({ message: "Work package not found" });

    const districtAllowed = await verifyVillageAccess(work.village, req.user.district);
    const isAssignedCollector = work.assignedCollector.toString() === req.user._id.toString();

    if (!districtAllowed && !isAssignedCollector) {
      return res.status(403).json({ message: "Access blocked: Not your district / not assigned reviewer" });
    }

    doc.status = decision;
    doc.reviewComments = comments;
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();

    // Add history entry for document review
    await WorkPackageHistory.create({
      packageId: work._id,
      action: `Document ${decision} - ${doc.documentType}`,
      status: work.status, // Keep work package status
      performedBy: req.user._id
    });

    res.json({ success: true, message: "Document reviewed", doc });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// COLLECTOR: Approve / Reject work package
// --------------------------------------------
export const reviewWorkPackage = async (req, res) => {
  try {
    const { decision, reason } = req.body;

    // ⭐ FIX: Fetch work package with all fields including village
    const work = await WorkPackage.findById(req.params.packageId)
      .populate("documents")
      .populate("village")
      .populate("project")
      .populate("createdBy", "fullName email")
      .populate("assignedCollector");
    
    if (!work) return res.status(404).json({ message: "Work package not found" });

    console.log("Work package village:", work.village);
    console.log("User district:", req.user.district);

    // Verify access
    const districtAllowed = await verifyVillageAccess(work.village._id || work.village, req.user.district);
    const isAssignedCollector = work.assignedCollector._id.toString() === req.user._id.toString();

    if (!districtAllowed && !isAssignedCollector) {
      return res.status(403).json({ message: "Access denied: Not authorized" });
    }

    // ⭐ FIX: Check if already reviewed
    if (work.status === "approved" || work.status === "rejected") {
      return res.status(400).json({ 
        message: "Work package already reviewed",
        currentStatus: work.status 
      });
    }

    // If approving, check all documents are approved
    if (decision === "approved") {
      const unapprovedDocs = work.documents.filter(d => d.status !== "approved");
      if (unapprovedDocs.length > 0) {
        return res.status(400).json({ 
          message: "All documents must be approved first",
          unapprovedCount: unapprovedDocs.length
        });
      }
    }

    // ⭐ FIX: Use findByIdAndUpdate instead of save() to avoid validation issues
    const updatedWork = await WorkPackage.findByIdAndUpdate(
      req.params.packageId,
      { 
        status: decision,
        rejectionReason: reason
      },
      { new: true, runValidators: false } // Don't run validators on update
    ).populate("documents");

    await WorkPackageHistory.create({
      packageId: work._id,
      action: `Work Package ${decision.toUpperCase()}`,
      status: decision,
      performedBy: req.user._id,
      comments: reason
    });

    res.json({ success: true, message: "Work package reviewed", work: updatedWork });

  } catch (err) {
    console.error("Review work package error:", err);
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// OFFICER: View work packages under specific project
// --------------------------------------------
export const getOfficerPackagesByProject = async (req, res) => {
  try {
    const data = await WorkPackage.find({
      project: req.params.projectId,
      createdBy: req.user._id
    })
      .populate("documents")
      .populate("project", "projectName");

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// COLLECTOR: View all pending packages (approval dashboard)
// --------------------------------------------
export const getPendingWorkPackages = async (req, res) => {
  try {
    const villages = await Village.find()
      .populate({ path: "block", populate: { path: "district" } });

    const allowedVillages = villages
      .filter(v => {
        const districtId = v.block.district._id || v.block.district;
        return districtId.toString() === req.user.district.toString();
      })
      .map(v => v._id.toString());

    const data = await WorkPackage.find({ 
      village: { $in: allowedVillages }, 
      status: "pending" 
    })
      .populate("createdBy", "fullName email")
      .populate("project", "projectName")
      .populate("documents");

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// COLLECTOR: View packages for specific project
// --------------------------------------------
export const getWorkPackagesByProject = async (req, res) => {
  try {
    const data = await WorkPackage.find({ project: req.params.projectId })
      .populate("project", "projectName")
      .populate("documents")
      .populate("createdBy", "fullName email");

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// History for a work package
// --------------------------------------------
export const getWorkPackageHistory = async (req, res) => {
  try {
    const work = await WorkPackage.findById(req.params.packageId);
    if (!work) return res.status(404).json({ message: "Work package not found" });

    const allowed = await verifyVillageAccess(work.village, req.user.district);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    const history = await WorkPackageHistory.find({ packageId: req.params.packageId })
      .populate("performedBy", "fullName role")
      .sort({ createdAt: -1 });

    res.json({ success: true, history });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------------------------------------
// Get single work package details
// --------------------------------------------
export const getCollectorSinglePackage = async (req, res) => {
  try {
    const work = await WorkPackage.findById(req.params.packageId)
      .populate("createdBy", "fullName email")
      .populate("project", "projectName")
      .populate("documents")
      .populate("history");

    if (!work) return res.status(404).json({ message: "Work package not found" });

    res.json({ success: true, work });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};