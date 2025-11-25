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
  assignSchemeToProject,
  getAllSchemes,
} from "../controllers/projectController.js";



const router = express.Router();

// Officer create request
router.post(
  "/request",
  protect,
  upload.array("documents", 10),
  createProjectRequest
);

// Collector view assigned requests
router.get(
  "/collector/requests",
  protect,
  requireRole("collector"),
  getCollectorRequests
);

// Officer view own submitted requests
router.get(
  "/my-requests",
  protect,
  requireRole("officer"),
  getMyRequests
);

// Collector review document
router.put(
  "/document/:docId/review",
  protect,
  requireRole("collector"),
  reviewProjectDocument
);

// Collector review final request
router.put(
  "/request/:requestId/review",
  protect,
  requireRole("collector"),
  reviewProjectRequest
);

// Collector get officers list
router.get(
  "/collector/officers",
  protect,
  requireRole("collector"),
  getOfficersUnderCollector
);

// ===============================
// 🚀 NEW ROUTES FOR SCHEME HANDLING
// ===============================

// Get all schemes (PM, Collector, Officer can see)
router.get(
  "/schemes",
  protect,
  getAllSchemes
);

// Assign scheme to project (Collector only)
router.put(
  "/assign-scheme/:projectId",
  protect,
  requireRole("collector"),
  assignSchemeToProject
);

export default router;
