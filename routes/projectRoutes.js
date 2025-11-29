// routes/projectRoutes.js - COMPLETE UPDATED VERSION
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  createProjectRequest,
  getCollectorRequests,
  getMyRequests,
  reviewProjectRequest,
  reviewProjectDocument,
  getOfficersUnderCollector,
  assignSchemeToRequest,
  getFilteredSchemes,
  collectorEditScheme,
  getAllSchemes,
  setProjectLocation,
  getApprovedProjects
} from "../controllers/projectController.js";

const router = express.Router();

// =====================================
// OFFICER ROUTES
// =====================================
// Officer create project request + upload documents
router.post(
  "/request",
  protect,
  upload.array("documents", 10),
  createProjectRequest
);

// Officer view their own submitted requests
router.get(
  "/my-requests",
  protect,
  requireRole("officer"),
  getMyRequests
);

// Officer: Get approved projects for verification
router.get(
  "/approved",
  protect,
  requireRole("officer"),
  getApprovedProjects
);

// =====================================
// OFFICER SCHEME ROUTES (NEW 🚀)
// =====================================
// Officer: Get filtered schemes by category + budget
router.get(
  "/schemes/filtered",
  protect,
  getFilteredSchemes
);

// Officer: Assign scheme to their project request
router.put(
  "/request/:requestId/assign-scheme",
  protect,
  requireRole("officer"),
  assignSchemeToRequest
);

// =====================================
// COLLECTOR ROUTES
// =====================================
// Collector view assigned requests (district restricted)
router.get(
  "/collector/requests",
  protect,
  requireRole("collector"),
  getCollectorRequests
);

// Collector review individual document
router.put(
  "/document/:docId/review",
  protect,
  requireRole("collector"),
  reviewProjectDocument
);

// Collector review/approve/reject final request
router.put(
  "/request/:requestId/review",
  protect,
  requireRole("collector"),
  reviewProjectRequest
);

// Collector get officers under them
router.get(
  "/collector/officers",
  protect,
  requireRole("collector"),
  getOfficersUnderCollector
);

// =====================================
// COLLECTOR SCHEME ROUTES (NEW 🚀)
// =====================================
// Collector: Edit/View/Remove scheme on requests
router.put(
  "/collector/request/:requestId/scheme",
  protect,
  requireRole("collector"),
  collectorEditScheme
);

// =====================================
// SHARED ROUTES (All Roles)
// =====================================
// Get all schemes (PM, Collector, Officer)
router.get(
  "/schemes",
  protect,
  getAllSchemes
);

// =====================================
// COLLECTOR MAP ROUTES
// =====================================
// Collector: Manually set project base coordinates
router.put(
  "/:projectId/location",
  protect,
  requireRole("collector"),
  setProjectLocation
);

export default router;
