// routes/projectRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  createProjectRequest,
  getCollectorRequests,
  getMyRequests,
  reviewProjectRequest,
  reviewProjectDocument,
  getOfficersUnderCollector,
} from "../controllers/projectController.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Officer create request
router.post(
  "/request",
  protect,
  upload.array("documents", 10),   // multiple files support
  createProjectRequest
);
// Officer upload document to request

// Collector view assigned requests
router.get("/collector/requests", protect, requireRole("collector"), getCollectorRequests);

// Officer view own submitted requests
router.get("/my-requests", protect, requireRole("officer"), getMyRequests);

// Collector review document
router.put("/document/:docId/review", protect, requireRole("collector"), reviewProjectDocument);

// Collector review final request
router.put("/request/:requestId/review", protect, requireRole("collector"), reviewProjectRequest);

router.get("/collector/officers",protect, requireRole("collector"), getOfficersUnderCollector);

export default router;
