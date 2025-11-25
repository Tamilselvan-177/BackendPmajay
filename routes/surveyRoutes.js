import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import audioUpload from "../middleware/uploadAudio.js";

import {
  getSurveyQuestions,
  createHouse,
  submitSurvey
} from "../controllers/SurveyController.js";

const router = express.Router();

router.get(
  "/questions",
  protect,
  requireRole("village"),
  getSurveyQuestions
);

router.post(
  "/create-house",
  protect,
  requireRole("village"),
  createHouse
);

router.post(
  "/submit",
  protect,
  requireRole("village"),
  audioUpload.array("voices", 20),
  submitSurvey
);

export default router;
