import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
  createWorkPackageWithUpload,
  uploadWorkPackageDocument,
  reviewDocument,
  reviewWorkPackage,
  getWorkPackageHistory,
  getPendingWorkPackages,
  getOfficerPackagesByProject,
  getWorkPackagesByProject
} from "../controllers/workPackageController.js";

const router = express.Router();

// Officer: Create work package + first document
router.post(
  "/request",
  protect,
  requireRole("officer"),
  upload.single("document"),
  createWorkPackageWithUpload
);

// Officer: Upload additional docs to work package
router.post(
  "/:packageId/upload",
  protect,
  requireRole("officer"),
  upload.single("document"),
  uploadWorkPackageDocument
);

// Officer: View work packages of specific project
router.get(
  "/project/:projectId/officer",
  protect,
  requireRole("officer"),
  getOfficerPackagesByProject
);

// Collector: Pending approval dashboard
router.get(
  "/pending",
  protect,
  requireRole("collector"),
  getPendingWorkPackages
);

// Collector: View all packages for project
router.get(
  "/project/:projectId",
  protect,
  requireRole("collector"),
  getWorkPackagesByProject
);

// Collector: Review individual document inside package
router.put(
  "/documents/:docId/review",
  protect,
  requireRole("collector"),
  reviewDocument
);

// Collector: Final approval / rejection of work package
router.put(
  "/:packageId/review",
  protect,
  requireRole("collector"),
  reviewWorkPackage
);

// History (both officer & collector allowed)
router.get("/:packageId/history", protect, getWorkPackageHistory);

export default router;
