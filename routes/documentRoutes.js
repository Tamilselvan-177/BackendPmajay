// routes/documentRoutes.js
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

// Officer uploads document to PROJECT REQUEST
router.post(
  "/upload/:requestId",
  protect,
  requireRole("officer"),
  upload.single("file"),
  uploadDocument
);

// Collector reviews document
router.put(
  "/review/:id",
  protect,
  requireRole("collector"),
  reviewDocument
);

// Collector dashboard assigned docs
router.get(
  "/assigned",
  protect,
  requireRole("collector"),
  getAssignedDocuments
);

// Officer views all docs of a project request
router.get(
  "/project/:requestId",
  protect,
  requireRole("officer"),
  getProjectDocuments
);

export default router;
