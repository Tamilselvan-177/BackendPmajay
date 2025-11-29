import express from "express";
import multer from "multer";
import path from "path";
import {
  getProjectsForMap,
  getProjectsByScheme,
  getProjectsByVillage,
  uploadVerification,
  getVerificationTimeline,
  updateVerificationFrequency,
  getAvailableSchemes,
  getProjectsForVerification,
  deleteVerification
} from "../controllers/verificationController.js";

import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// MULTER CONFIG
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/verifications/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "verification-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) cb(null, true);
  else cb(new Error("Only image files (JPG, JPEG, PNG) allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});


// GET /api/verifications/map
router.get(
  "/map",
  protect,
  requireRole("officer", "collector"),
  getProjectsForMap
);

// GET /api/verifications/schemes
router.get(
  "/schemes",
  protect,
  requireRole("officer", "collector"),
  getAvailableSchemes
);

// GET /api/verifications/scheme/:schemeId
router.get(
  "/scheme/:schemeId",
  protect,
  requireRole("officer", "collector"),
  getProjectsByScheme
);

// GET /api/verifications/village/:villageId
router.get(
  "/village/:villageId",
  protect,
  requireRole("officer", "collector"),
  getProjectsByVillage
);

// POST /api/verifications/upload/:projectId
router.post(
  "/upload/:projectId",
  protect,
  // Village app users can also upload progress photos
  requireRole("officer", "collector", "village"),
  upload.single("photo"),
  uploadVerification
);

// GET /api/verifications/timeline/:projectId
router.get(
  "/timeline/:projectId",
  protect,
  requireRole("officer", "collector"),
  getVerificationTimeline
);

// Alias used by CollectorVerificationPage: /project/:projectId
router.get(
  "/project/:projectId",
  protect,
  requireRole("officer", "collector"),
  getVerificationTimeline
);

// PATCH /api/verifications/frequency/:projectId
router.patch(
  "/frequency/:projectId",
  protect,
  requireRole("collector"),
  updateVerificationFrequency
);

// GET /api/verifications/projects
router.get(
  "/projects",
  protect,
  requireRole("officer", "collector", "village"),
  getProjectsForVerification
);

// DELETE /api/verifications/delete/:verificationId
router.delete(
  "/delete/:verificationId",
  protect,
  requireRole("officer", "collector"),
  deleteVerification
);

export default router;
