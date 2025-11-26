import House from "../models/House.js";
import Survey from "../models/Survey.js";

// 🔥 20 FIXED QUESTIONS
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
// GET QUESTIONS
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
    const { houseNumber } = req.body;

    const villageId = req.user.village;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: "Village not linked with user",
      });
    }

    // Check if house number already exists in this village
    const existingHouse = await House.findOne({
      village: villageId,
      houseNumber,
    });

    if (existingHouse) {
      return res.status(400).json({
        success: false,
        message: "House number already exists in this village",
      });
    }

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
// GET HOUSES BY VILLAGE (NEW)
// =========================
export const getHousesByVillage = async (req, res) => {
  try {
    const villageId = req.user.village;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: "Village not linked with user",
      });
    }

    const houses = await House.find({ village: villageId })
      .select("houseNumber createdBy village createdAt surveyStatus") // ✅ FIX
      .populate("village", "name")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: houses.length,
      houses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// =========================
// SUBMIT SURVEY
// =========================
// controllers/SurveyController.js (replace submitSurvey)
export const submitSurvey = async (req, res) => {
  try {
    const { houseId, answers } = req.body;

    // Auto-detect villageId from logged-in user
    const villageId = req.user.village;
    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: "Village not linked with user",
      });
    }

    // Verify house exists and belongs to this village
    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ success: false, message: "House not found" });
    }
    if (house.village.toString() !== villageId.toString()) {
      return res.status(403).json({ success: false, message: "House does not belong to your village" });
    }

    // If already completed, refuse
    if (house.surveyStatus === "completed") {
      return res.status(400).json({ success: false, message: "Survey already completed for this house" });
    }

    // Parse answers
    let parsedAnswers = [];
    try {
      parsedAnswers = Array.isArray(answers) ? answers : JSON.parse(answers);
    } catch (e) {
      return res.status(400).json({ success: false, message: "Invalid answer format. Must be JSON array." });
    }

    if (!Array.isArray(parsedAnswers) || parsedAnswers.length !== SURVEY_QUESTIONS.length) {
      return res.status(400).json({
        success: false,
        message: `Provide exactly ${SURVEY_QUESTIONS.length} answers`,
      });
    }

    const audioFiles = req.files || [];
    const voiceUrls = Array(SURVEY_QUESTIONS.length).fill(null);

    audioFiles.forEach((file) => {
      const match = file.fieldname.match(/\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1], 10);
        if (!Number.isNaN(index) && index >= 0 && index < voiceUrls.length) {
          voiceUrls[index] = file.path;
        }
      }
    });

    const formattedQuestions = SURVEY_QUESTIONS.map((q, index) => ({
      questionNumber: index + 1,
      questionText: q,
      answer: parsedAnswers[index] ?? "na",
      voiceUrl: voiceUrls[index] ?? null,
    }));

    const survey = await Survey.create({
      house: houseId,
      village: villageId,
      questions: formattedQuestions,
      status: "completed",
      createdBy: req.user._id,
    });

    // Update house to completed and return updated house
    const updatedHouse = await House.findByIdAndUpdate(
      houseId,
      { surveyStatus: "completed" },
      { new: true }
    ).select("houseNumber surveyStatus createdBy createdAt village");

    return res.json({
      success: true,
      message: "Survey submitted successfully",
      survey,
      house: updatedHouse,
    });
  } catch (err) {
    console.error("submitSurvey error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// GET MY SURVEYS (NEW)
// =========================
export const getMySurveys = async (req, res) => {
  try {
    const villageId = req.user.village;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: "Village not linked with user",
      });
    }

    const surveys = await Survey.find({ village: villageId })
      .populate("house", "houseNumber")
      .populate("village", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: surveys.length,
      surveys,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};