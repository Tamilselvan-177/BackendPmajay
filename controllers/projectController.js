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

    const { projectName, budget, description, villageId } = req.body; // ✅ NEW: villageId from form
    const assignedCollector = req.user.assignedCollector;

    if (!villageId) {
      return res.status(400).json({ message: "Please select a village" });
    }

    // ✅ NEW: Verify officer has access to this village (in their block)
    const village = await Village.findById(villageId).populate('block');
    
    if (!village) {
      return res.status(404).json({ message: "Village not found" });
    }

    // Check if village is in officer's block
    if (req.user.block && village.block._id.toString() !== req.user.block.toString()) {
      return res.status(403).json({ 
        message: "You can only create projects for villages in your block" 
      });
    }

    if (!assignedCollector) {
      return res.status(400).json({ message: "No collector assigned to your account" });
    }

    // Create project request
    const request = await ProjectRequest.create({
      projectName,
      budget,
      description,
      village: villageId, // ✅ Use selected village
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

    // Populate for response
    await request.populate('village', 'name');

    res.status(201).json({
      success: true,
      message: "Project request submitted successfully",
      request
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOfficerVillages = async (req, res) => {
  try {
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can access this" });
    }

    let villages = [];

    // If officer has a specific block assigned
    if (req.user.block) {
      villages = await Village.find({ block: req.user.block })
        .select('name scPopulation totalPopulation location')
        .populate('block', 'name')
        .sort({ name: 1 });
    } 
    // If officer has just village access
    else if (req.user.village) {
      const village = await Village.findById(req.user.village)
        .select('name scPopulation totalPopulation location')
        .populate('block', 'name');
      
      if (village) villages = [village];
    }

    res.json({
      success: true,
      count: villages.length,
      villages: villages.map(v => ({
        _id: v._id,
        name: v.name,
        scPopulation: v.scPopulation?.count || 0,
        totalPopulation: v.totalPopulation || 0,
        block: v.block?.name || 'N/A',
        location: v.location
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =========================================
// OFFICER: View Their Own Requests (ENHANCED WITH GROUPING)
// =========================================
export const getMyRequests = async (req, res) => {
  try {
    const requests = await ProjectRequest.find({ requestedBy: req.user._id })
      .populate("village", "name block scPopulation")
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

    // ✅ NEW: Group by village for easier viewing
    const groupedByVillage = requests.reduce((acc, req) => {
      const villageId = req.village?._id?.toString() || 'unknown';
      const villageName = req.village?.name || 'Unknown Village';
      
      if (!acc[villageId]) {
        acc[villageId] = {
          villageName,
          villageId,
          scPopulation: req.village?.scPopulation?.count || 0,
          requests: []
        };
      }
      
      acc[villageId].requests.push(req);
      return acc;
    }, {});

    // ✅ NEW: Summary stats
    const stats = {
      total: requests.length,
      approved: requests.filter(r => r.status === 'approved').length,
      pending: requests.filter(r => r.status === 'pending').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalBudget: requests.reduce((sum, r) => sum + (r.budget || 0), 0),
      villages: Object.keys(groupedByVillage).length
    };

    res.json({ 
      success: true, 
      count: requests.length,
      stats,
      requests,
      groupedByVillage: Object.values(groupedByVillage)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// NEW: Get Project Statistics for Officer Dashboard
// =========================================
export const getOfficerProjectStats = async (req, res) => {
  try {
    if (req.user.role !== "officer") {
      return res.status(403).json({ message: "Only officers can access this" });
    }

    // Get all requests
    const requests = await ProjectRequest.find({ requestedBy: req.user._id })
      .populate('village', 'name');

    // Get approved projects
    const projects = await Project.find({ officerInCharge: req.user._id })
      .populate('village', 'name');

    // Calculate stats
    const stats = {
      totalRequests: requests.length,
      approved: requests.filter(r => r.status === 'approved').length,
      pending: requests.filter(r => r.status === 'pending').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalBudget: requests.reduce((sum, r) => sum + (r.budget || 0), 0),
      approvedBudget: requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.budget || 0), 0),
      activeProjects: projects.filter(p => p.status === 'approved').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      
      // Village-wise breakdown
      villageStats: requests.reduce((acc, req) => {
        const villageId = req.village?._id?.toString();
        const villageName = req.village?.name || 'Unknown';
        
        if (!acc[villageId]) {
          acc[villageId] = {
            villageName,
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            totalBudget: 0
          };
        }
        
        acc[villageId].total++;
        acc[villageId][req.status]++;
        acc[villageId].totalBudget += req.budget || 0;
        
        return acc;
      }, {}),
      
      // Recent activity
      recentRequests: requests
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(r => ({
          _id: r._id,
          projectName: r.projectName,
          village: r.village?.name,
          status: r.status,
          budget: r.budget,
          createdAt: r.createdAt
        }))
    };

    res.json({
      success: true,
      stats
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
