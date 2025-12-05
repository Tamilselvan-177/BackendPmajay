// controllers/SurveyController.js

import House from "../models/House.js";
import Survey from "../models/Survey.js";
import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";
import { 
  computeIndicatorScore, 
  computeDomainScores 
} from "../utils/scoring.js";
// =========================
// SCORING HELPERS
// =========================

// Sir's EXACT scoring function
// Helper: find which domain an indicatorId belongs to
function findDomainByIndicatorId(indicatorId) {
  return Object.keys(PMJAY_DOMAINS).find(domainKey =>
    PMJAY_DOMAINS[domainKey].indicators.some(ind => ind.id === indicatorId)
  );
}

// Helper: get indicator config by id
function getIndicatorConfig(indicatorId) {
  const domainKey = findDomainByIndicatorId(indicatorId);
  if (!domainKey) return { domainKey: null, config: null };
  const config = PMJAY_DOMAINS[domainKey].indicators.find(ind => ind.id === indicatorId);
  return { domainKey, config };
}

// =========================
// GET SURVEY QUESTIONS (for frontend UI)
// =========================
export const getSurveyQuestions = async (req, res) => {
  try {
    res.json({
      success: true,
      domains: PMJAY_DOMAINS,
      totalIndicators: Object.values(PMJAY_DOMAINS).reduce(
        (sum, d) => sum + d.indicators.length,
        0
      )
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// CREATE A HOUSE (linked to village & user)
// =========================
export const createHouse = async (req, res) => {
  try {
    const { houseNumber } = req.body;
    const villageId = req.user.village;
    if (!villageId) 
      return res.status(400).json({ success: false, message: "Village not linked with user" });

    const exists = await House.findOne({ village: villageId, houseNumber });
    if (exists)
      return res.status(400).json({ success: false, message: "House already exists" });

    const { members, membersCount, address } = req.body;
    if (members && !Array.isArray(members))
      return res.status(400).json({ success: false, message: "Members must be an array of names" });

    const finalMembers = Array.isArray(members) ? members : [];
    const finalMembersCount = finalMembers.length || (membersCount ? Number(membersCount) : 0);

    const house = await House.create({
      village: villageId,
      houseNumber,
      createdBy: req.user._id,
      members: finalMembers,
      membersCount: finalMembersCount,
      address: address || ""
    });

    res.json({ success: true, message: "House created successfully", house });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// GET HOUSES BY VILLAGE
// =========================
export const getHousesByVillage = async (req, res) => {
  try {
    const villageId = req.user.village;
    if (!villageId)
      return res.status(400).json({ success: false, message: "Village not linked" });

    const houses = await House.find({ village: villageId })
      .select("houseNumber createdBy village createdAt surveyStatus address membersCount members")
      .populate("createdBy", "fullName")
      .populate("village", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, houses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// NEW CONSOLIDATED SURVEY SUBMISSION ENDPOINT (/submit-v2)
// =========================
// =========================
// NEW FIXED SUBMIT SURVEY V2
// =========================
export const submitSurveyV2 = async (req, res) => {
  try {
    const villageId = req.user.village;
    const { houseId, answers, surveyorName, members, membersCount } = req.body;

    if (!villageId)
      return res.status(400).json({ success: false, message: "Village not linked" });

    const house = await House.findById(houseId);
    if (!house)
      return res.status(404).json({ success: false, message: "House not found" });

    // ==============================
    // UPDATE HOUSE MEMBERS IF PROVIDED
    // ==============================
    let updatedHouse = house;
    if (members) {
      if (!Array.isArray(members))
        return res.status(400).json({ success: false, message: "Members must be an array" });

      const newCount = members.length || Number(membersCount) || 0;
      updatedHouse = await House.findByIdAndUpdate(
        houseId,
        { members, membersCount: newCount },
        { new: true }
      );
    }

    // ==============================
    // VALIDATE ANSWERS ARRAY
    // ==============================
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Answers array is empty or missing"
      });
    }

    // ==============================
    // PARSE INDICATORS PROPERLY
    // ==============================
    const indicators = [];

    for (const ans of answers) {
      const { indicatorId } = ans;

      const domainKey = Object.keys(PMJAY_DOMAINS).find(key =>
        PMJAY_DOMAINS[key].indicators.some(ind => ind.id === indicatorId)
      );

      if (!domainKey) {
        console.log("Invalid indicator ID:", indicatorId);
        continue; // skip invalid indicators
      }

      const config = PMJAY_DOMAINS[domainKey].indicators.find(ind => ind.id === indicatorId);

      const indicatorObj = {
        indicatorId,
        domain: domainKey,
        question: config.question || config.label || config.name || "Indicator question",
        answerType: config.type,
        answer: null,
        percentage: null,
        score: 0,   // AUTO-SCORED VIA MODEL HOOK
        remark: ""
      };

      // YES / NO
      if (config.type === "yes_no") {
        indicatorObj.answer = ans.answer === "yes" ? "yes" : "no";
      }

      // PERCENTAGE
      if (config.type === "percentage") {
        indicatorObj.percentage = Number(ans.percentage || 0);
      }

      indicators.push(indicatorObj);
    }

    if (indicators.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid indicators found in payload"
      });
    }

    // ==============================
    // CREATE SURVEY (auto score happens in survey model pre-save)
    // ==============================
    const survey = await Survey.create({
      house: houseId,
      village: villageId,
      indicators,
      status: "completed",
      surveyTakenBy: {
        name: surveyorName || req.user.fullName || "Unknown",
        user: req.user._id
      },
      members: updatedHouse.members || [],
      membersCount: updatedHouse.membersCount || 0
    });

    // Update house status
    await House.findByIdAndUpdate(houseId, { surveyStatus: "completed" });

    return res.json({
      success: true,
      message: "Survey submitted successfully",
      survey
    });

  } catch (err) {
    console.error("submitSurveyV2 ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// LEGACY ENDPOINTS (mark as deprecated or disable if no longer used)
// =========================
export const submitHouseholdSurvey = async (req, res) => {
  return res.status(410).json({ success: false, message: "Legacy endpoint disabled. Use /submit-v2 instead." });
};

export const submitInfrastructureSurvey = async (req, res) => {
  return res.status(410).json({ success: false, message: "Legacy endpoint disabled. Use /submit-v2 instead." });
};

export const submitSurvey = async (req, res) => {
  return res.status(410).json({ success: false, message: "Legacy endpoint disabled. Use /submit-v2 instead." });
};

// =========================
// GET ALL SURVEYS SUBMITTED BY USER'S VILLAGE
// =========================
export const getMySurveys = async (req, res) => {
  try {
    const villageId = req.user.village;
    const surveys = await Survey.find({ village: villageId })
      .populate("house", "houseNumber")
      .populate("village", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, surveys });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// GET COUNT OF COMPLETED SURVEYS FOR VILLAGE
// =========================
export const getCompletedSurveyCount = async (req, res) => {
  try {
    const villageId = req.user.village;
    if (!villageId)
      return res.status(400).json({ success: false, message: "Village not linked" });

    const count = await Survey.countDocuments({ village: villageId, status: "completed" });
    res.json({ success: true, completedSurveys: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// GET VILLAGE DOMAINS THAT SCORED ABOVE 70%
// =========================
export const getVillageDomainsAbove70 = async (req, res) => {
  try {
    const { villageId } = req.params;
    const surveys = await Survey.find({ village: villageId });

    if (surveys.length === 0) {
      return res.status(404).json({ success: false, message: "No surveys found for village" });
    }

    const aggregated = {};
    Object.entries(PMJAY_DOMAINS).forEach(([domainKey, d]) => {
      aggregated[domainKey] = {
        name: d.name,
        score: 0,
        maxScore: d.maxScore,
        totalMaxScore: d.maxScore * surveys.length,
        percentage: 0
      };
    });

    surveys.forEach(survey => {
      Object.entries(survey.domainScores || {}).forEach(([domain, score]) => {
        if (aggregated[domain]) {
          aggregated[domain].score += score;
        }
      });
    });

    Object.values(aggregated).forEach(d => {
      d.percentage = (d.score / d.totalMaxScore) * 100;
    });

    const above70 = Object.entries(aggregated)
      .filter(([_, d]) => d.percentage >= 70)
      .map(([key]) => key);

    res.json({
      success: true,
      village: villageId,
      domainScores: aggregated,
      domainsAbove70: above70
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
