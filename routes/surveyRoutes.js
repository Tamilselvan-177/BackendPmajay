import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import audioUpload from "../middleware/uploadAudio.js";

import {
  getSurveyQuestions,
  createHouse,
  getHousesByVillage,
  submitSurvey,
  submitHouseholdSurvey,
  submitInfrastructureSurvey,
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

// Get all houses for the logged-in village officer
router.get(
  "/houses",
  protect,
  requireRole("village"),
  getHousesByVillage
);

// NEW - Submit household survey (first step)
router.post(
  "/submit-household",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 10),
  submitHouseholdSurvey
);

// NEW - Submit infrastructure survey (second step)
router.post(
  "/submit-infrastructure",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 10),
  submitInfrastructureSurvey
);

// LEGACY - Submit survey with both household and infrastructure (combined)
router.post(
  "/submit",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 20),
  submitSurvey
);

export default router;