// =========================
// SURVEY CONTROLLER
// =========================

import House from "../models/House.js";
import Survey from "../models/Survey.js";

// 🔥 20 FIXED QUESTIONS (MANUALLY ADDED)
export const SURVEY_QUESTIONS = [
  "Do you have a toilet facility at home?",
  "Is your toilet currently functional?",
  "How many members live in the house?",
  "Is drinking water available inside your house?",
  "Is electricity available in your house?",
  "Do you have access to waste disposal?",
  "Are all children vaccinated?",
  "Do you have gas cylinder connection?",
  "Is there a separate bathroom in your house?",
  "Do you own your house?",
  "Do you have proper drainage connection?",
  "Does anyone in the house have chronic illness?",
  "Are all children attending school?",
  "Is tap water available everyday?",
  "Do you have livestock?",
  "Is there a toilet pit constructed?",
  "Do you receive benefits from government schemes?",
  "Do you use sanitary pads or proper hygiene products?",
  "Do you segregate waste (wet/dry)?",
  "Do you have rainwater harvesting facility?"
];


// =========================
// GET QUESTIONS (20 FIXED)
// =========================
export const getSurveyQuestions = async (req, res) => {
  try {
    res.json({
      success: true,
      total: SURVEY_QUESTIONS.length,
      questions: SURVEY_QUESTIONS,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// CREATE HOUSE
// =========================
export const createHouse = async (req, res) => {
  try {
    const { villageId, houseNumber } = req.body;

    const house = await House.create({
      village: villageId,
      houseNumber,
      createdBy: req.user._id,
    });

    res.json({
      success: true,
      message: "House created successfully",
      house,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// SUBMIT 20-QUESTION SURVEY
// =========================
export const submitSurvey = async (req, res) => {
  try {
    const { houseId, villageId } = req.body;

    const audioFiles = req.files; // voices[]

    if (!audioFiles || audioFiles.length !== 20) {
      return res.status(400).json({
        success: false,
        message: "You must upload exactly 20 voice files",
      });
    }

    // Map 20 questions with the corresponding 20 audio files
    const formattedQuestions = SURVEY_QUESTIONS.map((q, index) => ({
      questionNumber: index + 1,
      questionText: q,
      voiceUrl: audioFiles[index]?.path || null,
    }));

    const survey = await Survey.create({
      house: houseId,
      village: villageId,
      questions: formattedQuestions,
    });

    res.json({
      success: true,
      message: "Survey submitted successfully",
      survey,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
