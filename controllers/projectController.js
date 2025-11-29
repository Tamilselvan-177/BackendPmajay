// controllers/projectController.js - COMPLETE UPDATED VERSION
import ProjectRequest from "../models/ProjectRequest.js";
import Project from "../models/Project.js";
import Village from "../models/Village.js";
import ProjectDocument from "../models/ProjectDocument.js";
import User from "../models/User.js";
import Scheme from "../models/Scheme.js";

// =====================================
// OFFICER: Get Approved Projects for Verification
// =====================================
export const getApprovedProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      officerInCharge: req.user._id
    })
      .populate({
        path: "village",
        select: "name block",
        populate: {
          path: "block",
          select: "name district",
          populate: {
            path: "district",
            select: "name state",
            populate: {
              path: "state",
              select: "name"
            }
          }
        }
      })
      .populate("assignedScheme", "schemeName description budgetLimit")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error("❌ getApprovedProjects ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

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
    const villageId = req.user.village || req.body.villageId;
    const assignedCollector = req.user.assignedCollector;

    if (!villageId) {
      return res.status(400).json({ message: "Village is missing for request" });
    }

    if (!assignedCollector) {
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
      .populate({
        path: "assignedScheme",
        select: "schemeName description budgetLimit",
        model: "Scheme"
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
// COLLECTOR: Approve / Reject Request (COPIES SCHEME TO PROJECT)
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

    // Check all documents approved
    const docs = await ProjectDocument.find({ _id: { $in: request.documents } });
    const unapproved = docs.filter(doc => doc.status !== "approved");

    if (unapproved.length > 0) {
      return res.status(400).json({ message: "All documents must be approved first" });
    }

    request.status = "approved";
    await request.save();

    // ✅ CREATE PROJECT & COPY SCHEME FROM REQUEST
    const project = await Project.create({
      projectName: request.projectName,
      budget: request.budget,
      village: request.village,
      officerInCharge: request.requestedBy,
      documents: request.documents,
      assignedScheme: request.assignedScheme, // ✅ Copies officer-assigned scheme
      status: "approved"
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
      .populate({
        path: "assignedScheme",
        select: "schemeName description budgetLimit",
        model: "Scheme"
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =====================================
// COLLECTOR: Get Officers Under Them
// =====================================
export const getOfficersUnderCollector = async (req, res) => {
  try {
    const collectorId = req.user._id;

    const officers = await User.find({
      role: "officer",
      assignedCollector: collectorId
    })
      .populate("state", "name")
      .populate("district", "name")
      .populate("block", "name")
      .populate("village", "name");

    if (!officers.length) {
      return res.status(200).json({
        success: true,
        message: "No officers found under this collector",
        officers: [],
      });
    }

    res.status(200).json({
      success: true,
      count: officers.length,
      officers
    });
  } catch (error) {
    console.error("❌ Error fetching officers under collector:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================================
// OFFICER: Get Filtered Schemes by Category + Budget
// =====================================
// controllers/projectController.js - FIXED COLLECTOR ACCESS
export const getFilteredSchemes = async (req, res) => {
  try {
    // ✅ FIXED: Allow BOTH officer AND collector
    if (!["officer", "collector"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only officers and collectors can view schemes" });
    }

    const { category, budget } = req.query;
    let filter = {};

    // Category filtering (same logic)
    if (category) {
      const categoryKeywords = {
        health: ["health", "hospital", "phc", "clinic", "ayushman", "nhm"],
        road: ["road", "pmgsy", "sadak"],
        water: ["water", "jal", "drinking", "tank"],
        education: ["school", "library", "e-library"],
        housing: ["awas", "housing"],
        agriculture: ["krishi", "warehouse", "agricultural", "matsya"],
        sanitation: ["swachh", "drainage", "sewage", "toilet"],
        employment: ["mgnrega", "employment", "skill"],
        electricity: ["solar", "electrification"],
        women: ["women", "welfare", "livelihood", "shg"],
        sports: ["stadium", "sports"]
      };

      const keywords = categoryKeywords[category.toLowerCase()] || [];
      if (keywords.length > 0) {
        filter.schemeName = { $regex: keywords.join("|"), $options: "i" };
      }
    }

    // Budget filtering
    if (budget) {
      const budgetNum = parseInt(budget);
      filter.budgetLimit = { $gte: budgetNum };
    }

    const schemes = await Scheme.find(filter).sort({ schemeName: 1 });

    res.status(200).json({
      success: true,
      count: schemes.length,
      filters: { category, budget: parseInt(budget) || 0 },
      schemes: schemes.map(scheme => ({
        _id: scheme._id,
        schemeName: scheme.schemeName,
        description: scheme.description,
        budgetLimit: scheme.budgetLimit.toLocaleString(),
        budgetLimitNum: scheme.budgetLimit,
        category: scheme.category || "general",
        suitable: budget ? scheme.budgetLimit >= parseInt(budget) : true
      }))
    });
  } catch (err) {
    console.error("❌ getFilteredSchemes ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schemes",
      error: err.message
    });
  }
};

// =====================================
// OFFICER: Assign Scheme to Their Project Request
// =====================================
export const assignSchemeToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { schemeId } = req.body;

    // Only officer can assign to their own request
    const request = await ProjectRequest.findOne({
      _id: requestId,
      requestedBy: req.user._id
    }).populate("assignedScheme");

    if (!request) {
      return res.status(404).json({ 
        message: "Project request not found or access denied" 
      });
    }

    if (!schemeId) {
      return res.status(400).json({ message: "Scheme ID is required" });
    }

    // Verify scheme exists
    const scheme = await Scheme.findById(schemeId);
    if (!scheme) {
      return res.status(404).json({ message: "Scheme not found" });
    }

    // Check budget compatibility
    if (scheme.budgetLimit < request.budget) {
      return res.status(400).json({ 
        message: `Scheme budget limit (₹${scheme.budgetLimit.toLocaleString()}) is less than project budget (₹${request.budget.toLocaleString()})` 
      });
    }

    request.assignedScheme = schemeId;
    await request.save();

    res.json({ 
      success: true, 
      message: "Scheme assigned successfully", 
      request,
      scheme: {
        schemeName: scheme.schemeName,
        budgetLimit: scheme.budgetLimit.toLocaleString()
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =====================================
// COLLECTOR: Edit/View Assigned Scheme
// =====================================
export const collectorEditScheme = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can edit schemes" });
    }

    const { requestId } = req.params;
    const { schemeId, action } = req.body; // action: "assign", "remove", "change"

    const request = await ProjectRequest.findOne({
      _id: requestId,
      assignedCollector: req.user._id
    });

    if (!request) {
      return res.status(404).json({ message: "Project request not found" });
    }

    if (action === "remove") {
      request.assignedScheme = null;
      await request.save();
      return res.json({ 
        success: true, 
        message: "Scheme removed successfully",
        request 
      });
    }

    if (schemeId) {
      const scheme = await Scheme.findById(schemeId);
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }

      // Budget check
      if (scheme.budgetLimit < request.budget) {
        return res.status(400).json({ 
          message: `Scheme budget limit (₹${scheme.budgetLimit.toLocaleString()}) is less than project budget (₹${request.budget.toLocaleString()})` 
        });
      }

      request.assignedScheme = schemeId;
      await request.save();

      res.json({ 
        success: true, 
        message: "Scheme updated successfully", 
        request,
        scheme: {
          schemeName: scheme.schemeName,
          budgetLimit: scheme.budgetLimit.toLocaleString()
        }
      });
    } else {
      // Just view current scheme
      const scheme = request.assignedScheme 
        ? await Scheme.findById(request.assignedScheme).select("schemeName budgetLimit")
        : null;

      res.json({
        success: true,
        request,
        scheme: scheme ? {
          schemeName: scheme.schemeName,
          budgetLimit: scheme.budgetLimit.toLocaleString()
        } : null
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =====================================
// Get All Schemes (PM/Collector/Officer)
// =====================================
export const getAllSchemes = async (req, res) => {
  try {
    const schemes = await Scheme.find().sort({ schemeName: 1 });

    res.status(200).json({
      success: true,
      count: schemes.length,
      schemes: schemes.map(scheme => ({
        _id: scheme._id,
        schemeName: scheme.schemeName,
        description: scheme.description,
        budgetLimit: scheme.budgetLimit.toLocaleString()
      }))
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch schemes",
      error: err.message
    });
  }
};

// =====================================
// COLLECTOR: Manually set project base location
// =====================================
export const setProjectLocation = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can set project location" });
    }

    const { projectId } = req.params;
    const { latitude, longitude, address } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === null ||
      longitude === null
    ) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const project = await Project.findById(projectId).populate({
      path: "village",
      populate: { path: "block", populate: { path: "district" } }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Ensure project is inside collector's district
    if (project.village.block.district._id.toString() !== req.user.district.toString()) {
      return res.status(403).json({ message: "Project not in your district" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "Invalid latitude or longitude values" });
    }

    project.location = {
      type: "Point",
      coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
      address: address || ""
    };

    await project.save();

    const updatedProject = await Project.findById(projectId).select("location projectName");
    
    console.log("✅ Location saved for project:", {
      projectId: project._id,
      projectName: project.projectName,
      location: updatedProject.location,
      coordinates: updatedProject.location?.coordinates
    });

    res.json({
      success: true,
      message: "Project location updated",
      project: {
        _id: project._id,
        projectName: project.projectName,
        location: updatedProject.location
      }
    });
  } catch (error) {
    console.error("❌ Error setting project location:", error);
    res.status(500).json({ message: error.message });
  }
};
