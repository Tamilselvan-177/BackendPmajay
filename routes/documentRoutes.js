import express from "express";
import upload from "../middleware/uploadMiddleware.js";

import {
  uploadDocument,
  reviewDocument,
  getAssignedDocuments,
  getProjectDocuments
} from "../controllers/documentController.js";

import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Officer uploads
router.post(
  "/upload/:projectId",
  protect,
  requireRole("officer"),
  upload.single("file"),
  uploadDocument
);

// Collector reviews
router.put(
  "/review/:id",
  protect,
  requireRole("collector"),
  reviewDocument
);

// Collector dashboard
router.get(
  "/assigned",
  protect,
  requireRole("collector"),
  getAssignedDocuments
);

// Officer view project documents
router.get(
  "/project/:projectId",
  protect,
  requireRole("officer"),
  getProjectDocuments
);

export default router;
