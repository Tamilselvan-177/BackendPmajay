import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import audioUpload from "../middleware/uploadAudio.js";

import {
  getSurveyQuestions,
  createHouse,
  getHousesByVillage,
  submitSurvey,
} from "../controllers/SurveyController.js";

const router = express.Router();

// Get all survey questions
router.get(
  "/questions",
  protect,
  requireRole("village"),
  getSurveyQuestions
);

// Create a new house
router.post(
  "/create-house",
  protect,
  requireRole("village"),
  createHouse
);

// ✅ ADDED - Get all houses for the logged-in village officer
router.get(
  "/houses",
  protect,
  requireRole("village"),
  getHousesByVillage
);

// Submit survey with optional audio files
router.post(
  "/submit",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 20),
  submitSurvey
);

export default router;