// routes/surveyRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import audioUpload from "../middleware/uploadAudio.js";
import {
  getSurveyQuestions,
  createHouse,
  getHousesByVillage,
  submitSurveyV2,
  submitHouseholdSurvey,
  submitInfrastructureSurvey,
  submitSurvey,
  getCompletedSurveyCount,
  getVillageDomainsAbove70,
  getMySurveys
} from "../controllers/SurveyController.js";

const router = express.Router();

router.get("/questions", protect, requireRole("village"), getSurveyQuestions);
router.post("/create-house", protect, requireRole("village"), createHouse);
router.get("/houses", protect, requireRole("village"), getHousesByVillage);

// NEW MAIN ENDPOINT
router.post(
  "/submit-v2",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 20),
  submitSurveyV2
);

// Legacy (return 410 now)
router.post(
  "/submit-household",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 10),
  submitHouseholdSurvey
);
router.post(
  "/submit-infrastructure",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 10),
  submitInfrastructureSurvey
);
router.post(
  "/submit",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 20),
  submitSurvey
);

router.get(
  "/completed-count",
  protect,
  requireRole("village"),
  getCompletedSurveyCount
);

router.get(
  "/my-surveys",
  protect,
  requireRole("village"),
  getMySurveys
);

router.get(
  "/village/:villageId/domains-above-70",
  protect,
  getVillageDomainsAbove70
);

export default router;
