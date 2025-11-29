// controllers/verificationController.js
import ProjectVerification from "../models/ProjectVerification.js";
import Project from "../models/Project.js";
import ProjectRequest from "../models/ProjectRequest.js";
import Village from "../models/Village.js";

// =========================================
// UTILITY: Check if user has access to project
// =========================================
const checkProjectAccess = async (
  projectId,
  userId,
  userRole,
  userDistrict,
  userBlock,
  userVillage
) => {
  const project = await Project.findById(projectId).populate({
    path: "village",
    populate: {
      path: "block",
      populate: { path: "district" }
    }
  });

  if (!project) return { allowed: false, message: "Project not found" };

  // Officer can only verify projects in their block
  if (userRole === "officer") {
    if (project.village.block._id.toString() !== userBlock.toString()) {
      return { allowed: false, message: "You can only verify projects in your block" };
    }
  }

  // Collector can verify any project in their district
  if (userRole === "collector") {
    if (project.village.block.district._id.toString() !== userDistrict.toString()) {
      return { allowed: false, message: "Project not in your district" };
    }
  }

  // Village user can verify any project in their own village
  if (userRole === "village") {
    if (!userVillage || project.village._id.toString() !== userVillage.toString()) {
      return { allowed: false, message: "You can only verify projects in your village" };
    }
  }

  return { allowed: true, project };
};

// =========================================
// 1. GET ALL PROJECTS FOR MAP (Role-based filtering)
// =========================================
export const getProjectsForMap = async (req, res) => {
  try {
    const { role, _id: userId, district, block } = req.user;

    let query = {};

    // Officer sees only projects in their block
    if (role === "officer") {
      const villages = await Village.find({ block: block }).select("_id");
      query.village = { $in: villages.map(v => v._id) };
    }

    // Collector sees all projects in their district
    if (role === "collector") {
      const villages = await Village.find()
        .populate({
          path: "block",
          populate: { path: "district" }
        });

      const allowedVillages = villages
        .filter(v => v.block.district._id.toString() === district.toString())
        .map(v => v._id);

      query.village = { $in: allowedVillages };
    }

    const projects = await Project.find(query)
      .populate("village", "name")
      .populate("officerInCharge", "fullName email")
      .populate("assignedScheme", "schemeName description")
      .populate({
        path: "village",
        populate: {
          path: "block",
          populate: { path: "district" }
        }
      })
      .sort({ lastVerifiedAt: 1, createdAt: -1 });

    // Get latest verification with location for each project
    const projectsWithLocations = await Promise.all(
      projects.map(async (project) => {
        const latestVerification = await ProjectVerification.findOne({ 
          project: project._id 
        })
          .sort({ createdAt: -1 })
          .populate("verifiedBy", "fullName email role");

        // Helper to check if location has valid coordinates
        const isValidLocation = (loc) => {
          if (!loc) return false;
          const coords = loc.coordinates;
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return (
            typeof lng === "number" &&
            typeof lat === "number" &&
            !Number.isNaN(lng) &&
            !Number.isNaN(lat) &&
            lng >= -180 && lng <= 180 &&
            lat >= -90 && lat <= 90
          );
        };

        // Prefer latest verification location; fall back to manually set project.location
        // Convert Mongoose document to plain object if needed
        const projectLoc = project.location ? {
          type: project.location.type || "Point",
          coordinates: project.location.coordinates ? [...project.location.coordinates] : null,
          address: project.location.address || ""
        } : null;
        
        const location = latestVerification?.location || projectLoc || null;
        const validLocation = isValidLocation(location) ? location : null;
        
        // Debug log for projects without valid location
        if (!validLocation && project.location) {
          console.log(`⚠️ Project "${project.projectName}" has location but invalid coordinates:`, {
            location: project.location,
            coordinates: project.location.coordinates,
            type: typeof project.location.coordinates
          });
        }

        return {
          _id: project._id,
          projectName: project.projectName,
          schemeName: project.assignedScheme?.schemeName || "Unassigned",
          village: {
            _id: project.village._id,
            name: project.village.name,
            block: project.village.block?.name || "",
            district: project.village.block?.district?.name || ""
          },
          officerInCharge: project.officerInCharge,
          budget: project.budget,
          currentProgress: project.currentProgress,
          currentStatus: project.currentStatus,
          verificationCount: project.verificationCount,
          lastVerifiedAt: project.lastVerifiedAt,
          needsVerification: project.needsVerification,
          location: validLocation,
          latestVerification: latestVerification ? {
            _id: latestVerification._id,
            photo: latestVerification.photo,
            description: latestVerification.description,
            progressPercentage: latestVerification.progressPercentage,
            workStatus: latestVerification.workStatus,
            verifiedBy: latestVerification.verifiedBy,
            createdAt: latestVerification.createdAt
          } : null
        };
      })
    );

    // Filter out projects without valid location data
    const validProjects = projectsWithLocations.filter(p => p.location !== null && p.location.coordinates);

    res.json({
      success: true,
      count: validProjects.length,
      projects: validProjects
    });

  } catch (error) {
    console.error("❌ Error fetching projects for map:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 2. GET PROJECTS BY SCHEME (for map layers)
// =========================================
export const getProjectsByScheme = async (req, res) => {
  try {
    const { role, district, block } = req.user;
    const { schemeId } = req.params;

    let query = { assignedScheme: schemeId };

    // Role-based filtering
    if (role === "officer") {
      const villages = await Village.find({ block: block }).select("_id");
      query.village = { $in: villages.map(v => v._id) };
    }

    if (role === "collector") {
      const villages = await Village.find()
        .populate({
          path: "block",
          populate: { path: "district" }
        });

      const allowedVillages = villages
        .filter(v => v.block.district._id.toString() === district.toString())
        .map(v => v._id);

      query.village = { $in: allowedVillages };
    }

    const projects = await Project.find(query)
      .populate("village", "name")
      .populate("officerInCharge", "fullName email")
      .populate("assignedScheme", "schemeName description")
      .populate({
        path: "village",
        populate: {
          path: "block",
          populate: { path: "district" }
        }
      })
      .sort({ lastVerifiedAt: 1, createdAt: -1 });

    // Build same response shape as getProjectsForMap so frontend map works consistently
    const projectsWithLocations = await Promise.all(
      projects.map(async (project) => {
        const latestVerification = await ProjectVerification.findOne({
          project: project._id
        })
          .sort({ createdAt: -1 })
          .populate("verifiedBy", "fullName email role");

        // Helper to check if location has valid coordinates
        const isValidLocation = (loc) => {
          if (!loc) return false;
          const coords = loc.coordinates;
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            typeof coords[0] === "number" &&
            typeof coords[1] === "number" &&
            !Number.isNaN(coords[0]) &&
            !Number.isNaN(coords[1])
          );
        };

        const location = latestVerification?.location || project.location || null;
        if (!isValidLocation(location)) return null;

        return {
          _id: project._id,
          projectName: project.projectName,
          schemeName: project.assignedScheme?.schemeName || "Unassigned",
          village: {
            _id: project.village._id,
            name: project.village.name,
            block: project.village.block?.name || "",
            district: project.village.block?.district?.name || ""
          },
          officerInCharge: project.officerInCharge,
          budget: project.budget,
          currentProgress: project.currentProgress,
          currentStatus: project.currentStatus,
          verificationCount: project.verificationCount,
          lastVerifiedAt: project.lastVerifiedAt,
          needsVerification: project.needsVerification,
          location,
          latestVerification: latestVerification
            ? {
                _id: latestVerification._id,
                photo: latestVerification.photo,
                description: latestVerification.description,
                progressPercentage: latestVerification.progressPercentage,
                workStatus: latestVerification.workStatus,
                verifiedBy: latestVerification.verifiedBy,
                createdAt: latestVerification.createdAt
              }
            : null
        };
      })
    );

    const validProjects = projectsWithLocations.filter((p) => p !== null);

    res.json({
      success: true,
      scheme: schemeId,
      count: validProjects.length,
      projects: validProjects
    });

  } catch (error) {
    console.error("❌ Error fetching projects by scheme:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 3. GET PROJECTS BY VILLAGE (for drilling down)
// =========================================
export const getProjectsByVillage = async (req, res) => {
  try {
    const { role, district, block } = req.user;
    const { villageId } = req.params;

    // Verify access to village
    const village = await Village.findById(villageId).populate({
      path: "block",
      populate: { path: "district" }
    });

    if (!village) {
      return res.status(404).json({ message: "Village not found" });
    }

    // Check access
    if (role === "officer" && village.block._id.toString() !== block.toString()) {
      return res.status(403).json({ message: "Village not in your block" });
    }

    if (role === "collector" && village.block.district._id.toString() !== district.toString()) {
      return res.status(403).json({ message: "Village not in your district" });
    }

    const projects = await Project.find({ village: villageId })
      .populate("assignedScheme", "schemeName description")
      .populate("officerInCharge", "fullName email");

    // Get all verifications for these projects
    const projectsWithVerifications = await Promise.all(
      projects.map(async (project) => {
        const verifications = await ProjectVerification.find({ 
          project: project._id 
        })
          .sort({ createdAt: -1 })
          .populate("verifiedBy", "fullName email role");

        return {
          _id: project._id,
          projectName: project.projectName,
          schemeName: project.assignedScheme?.schemeName || "Unassigned",
          budget: project.budget,
          currentProgress: project.currentProgress,
          currentStatus: project.currentStatus,
          verificationCount: project.verificationCount,
          // base project location so frontend can fall back when no verifications
          location: project.location || null,
          verifications: verifications.map(v => ({
            _id: v._id,
            photo: v.photo,
            description: v.description,
            progressPercentage: v.progressPercentage,
            workStatus: v.workStatus,
            location: v.location,
            verifiedBy: v.verifiedBy,
            createdAt: v.createdAt
          }))
        };
      })
    );

    res.json({
      success: true,
      village: {
        _id: village._id,
        name: village.name,
        block: village.block.name,
        district: village.block.district.name
      },
      count: projectsWithVerifications.length,
      projects: projectsWithVerifications
    });

  } catch (error) {
    console.error("❌ Error fetching projects by village:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 4. UPLOAD VERIFICATION (with configurable frequency)
// =========================================
export const uploadVerification = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { description, progressPercentage, workStatus, issues, latitude, longitude, address } = req.body;

    // Validate access
    const accessCheck = await checkProjectAccess(
      projectId, 
      req.user._id, 
      req.user.role, 
      req.user.district,
      req.user.block,
      req.user.village
    );
    
    if (!accessCheck.allowed) {
      return res.status(403).json({ message: accessCheck.message });
    }

    const project = accessCheck.project;

    // Check if photo is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "Photo is required for verification" });
    }

    // Validate GPS coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "GPS location is required" });
    }

    // Get project request
    const projectRequest = await ProjectRequest.findOne({
      projectName: project.projectName,
      village: project.village,
      requestedBy: project.officerInCharge
    });

    if (!projectRequest) {
      return res.status(404).json({ message: "Associated project request not found" });
    }

    // Get next verification number
    const lastVerification = await ProjectVerification.findOne({ project: projectId })
      .sort({ verificationNumber: -1 });
    
    const verificationNumber = lastVerification ? lastVerification.verificationNumber + 1 : 1;

    // Create verification record
    const verification = await ProjectVerification.create({
      project: projectId,
      projectRequest: projectRequest._id,
      verifiedBy: req.user._id,
      photo: {
        fileName: req.file.filename,
        // Stored under uploads/verifications, serve from /uploads/verifications
        fileUrl: `/uploads/verifications/${req.file.filename}`,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      },
      description,
      progressPercentage: progressPercentage || 0,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || ""
      },
      workStatus: workStatus || "in_progress",
      issues: issues || "",
      verificationNumber
    });

    // Update project
    project.verificationCount += 1;
    project.lastVerifiedAt = new Date();
    project.currentProgress = progressPercentage || 0;
    project.currentStatus = workStatus || "in_progress";
    project.needsVerification = false;
    project.verificationOverdueDays = 0;
    await project.save();

    await verification.populate("verifiedBy", "fullName email role");

    res.status(201).json({
      success: true,
      message: "Verification uploaded successfully",
      verification
    });

  } catch (error) {
    console.error("❌ Error uploading verification:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 5. GET VERIFICATION TIMELINE
// =========================================
export const getVerificationTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;

    const accessCheck = await checkProjectAccess(
      projectId, 
      req.user._id, 
      req.user.role, 
      req.user.district,
      req.user.block,
      req.user.village
    );
    
    if (!accessCheck.allowed) {
      return res.status(403).json({ message: accessCheck.message });
    }

    const verifications = await ProjectVerification.find({ project: projectId })
      .populate("verifiedBy", "fullName email role")
      .sort({ createdAt: -1 });

    const project = await Project.findById(projectId)
      .populate("village", "name")
      .populate("officerInCharge", "fullName email")
      .populate("assignedScheme", "schemeName description");

    res.json({
      success: true,
      project: {
        _id: project._id,
        projectName: project.projectName,
        budget: project.budget,
        village: project.village,
        officerInCharge: project.officerInCharge,
        assignedScheme: project.assignedScheme,
        currentProgress: project.currentProgress,
        currentStatus: project.currentStatus,
        verificationCount: project.verificationCount,
        lastVerifiedAt: project.lastVerifiedAt
      },
      count: verifications.length,
      verifications
    });

  } catch (error) {
    console.error("❌ Error fetching timeline:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 6b. GET PROJECTS FOR VERIFICATION LISTS
// =========================================
export const getProjectsForVerification = async (req, res) => {
  try {
    const { role, district, block, village, _id: userId } = req.user;

    let query = {};

    // Officers: projects where they are in charge
    if (role === "officer") {
      query.officerInCharge = userId;
    }

    // Collectors: all projects in their district
    if (role === "collector") {
      const villages = await Village.find()
        .populate({
          path: "block",
          populate: { path: "district" }
        });

      const allowedVillages = villages
        .filter((v) => v.block.district._id.toString() === district.toString())
        .map((v) => v._id);

      query.village = { $in: allowedVillages };
    }

    // Village users: projects in their village
    if (role === "village") {
      if (!village) {
        return res
          .status(400)
          .json({ message: "Village user does not have a linked village" });
      }
      query.village = village;
    }

    const projects = await Project.find(query)
      .populate("village", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    console.error("❌ Error fetching projects for verification:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 6. UPDATE VERIFICATION FREQUENCY
// =========================================
export const updateVerificationFrequency = async (req, res) => {
  try {
    if (req.user.role !== "collector") {
      return res.status(403).json({ message: "Only collectors can update verification frequency" });
    }

    const { projectId } = req.params;
    const { frequency, customDays } = req.body;

    const project = await Project.findById(projectId).populate({
      path: "village",
      populate: {
        path: "block",
        populate: { path: "district" }
      }
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.village.block.district._id.toString() !== req.user.district.toString()) {
      return res.status(403).json({ message: "Project not in your district" });
    }

    project.verificationFrequency = frequency;
    if (frequency === "custom" && customDays) {
      project.customFrequencyDays = customDays;
    }

    await project.save();

    res.json({
      success: true,
      message: "Verification frequency updated",
      project: {
        _id: project._id,
        projectName: project.projectName,
        verificationFrequency: project.verificationFrequency,
        customFrequencyDays: project.customFrequencyDays
      }
    });

  } catch (error) {
    console.error("❌ Error updating frequency:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 7. GET AVAILABLE SCHEMES (for map layers)
// =========================================
export const getAvailableSchemes = async (req, res) => {
  try {
    const { role, district, block } = req.user;

    let query = {};

    if (role === "officer") {
      const villages = await Village.find({ block: block }).select("_id");
      query.village = { $in: villages.map(v => v._id) };
    }

    if (role === "collector") {
      const villages = await Village.find()
        .populate({
          path: "block",
          populate: { path: "district" }
        });

      const allowedVillages = villages
        .filter(v => v.block.district._id.toString() === district.toString())
        .map(v => v._id);

      query.village = { $in: allowedVillages };
    }

    const projects = await Project.find(query)
      .populate("assignedScheme", "schemeName description");

    // Get unique schemes with project counts
    const schemeMap = new Map();
    
    projects.forEach(project => {
      if (project.assignedScheme) {
        const schemeId = project.assignedScheme._id.toString();
        if (!schemeMap.has(schemeId)) {
          schemeMap.set(schemeId, {
            _id: project.assignedScheme._id,
            schemeName: project.assignedScheme.schemeName,
            description: project.assignedScheme.description,
            projectCount: 0
          });
        }
        schemeMap.get(schemeId).projectCount++;
      }
    });

    const schemes = Array.from(schemeMap.values());

    res.json({
      success: true,
      count: schemes.length,
      schemes
    });

  } catch (error) {
    console.error("❌ Error fetching schemes:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================================
// 8. DELETE VERIFICATION (collector/officer)
// =========================================
export const deleteVerification = async (req, res) => {
  try {
    const { verificationId } = req.params;

    const verification = await ProjectVerification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({ message: "Verification not found" });
    }

    // Check access via project
    const accessCheck = await checkProjectAccess(
      verification.project,
      req.user._id,
      req.user.role,
      req.user.district,
      req.user.block,
      req.user.village
    );

    if (!accessCheck.allowed) {
      return res.status(403).json({ message: accessCheck.message });
    }

    const project = accessCheck.project;

    // Delete verification
    await verification.deleteOne();

    // Recalculate project verification stats
    const remaining = await ProjectVerification.find({ project: project._id })
      .sort({ createdAt: -1 });

    project.verificationCount = remaining.length;

    if (remaining.length === 0) {
      project.lastVerifiedAt = null;
      project.currentProgress = 0;
      project.currentStatus = "not_started";
    } else {
      const latest = remaining[0];
      project.lastVerifiedAt = latest.createdAt;
      project.currentProgress = latest.progressPercentage || 0;
      project.currentStatus = latest.workStatus || "in_progress";
    }

    await project.save();

    res.json({
      success: true,
      message: "Verification deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting verification:", error);
    res.status(500).json({ message: error.message });
  }
};