import House from "../models/House.js";
import Survey from "../models/Survey.js";

// =========================
// PM-AJAY: Reduced 20 Questions (10 Infrastructure + 10 Household)
// =========================

export const INFRA_QUESTIONS = [
  {
    id: 1,
    category: "Infrastructure",
    domain: "Drinking Water & Sanitation",
    question: "Is sustainable drinking water available in the village?",
  },
  {
    id: 2,
    category: "Infrastructure",
    domain: "Toilets",
    question: "Are toilets available in all schools and Anganwadis?",
  },
  {
    id: 3,
    category: "Infrastructure",
    domain: "Drainage",
    question: "Are drains available along internal roads?",
  },
  {
    id: 4,
    category: "Infrastructure",
    domain: "Drainage",
    question: "Are existing drains functioning properly?",
  },
  {
    id: 5,
    category: "Infrastructure",
    domain: "Waste Management",
    question: "Is solid and liquid waste disposed effectively?",
  },
  {
    id: 6,
    category: "Infrastructure",
    domain: "Health",
    question: "Is ambulance service available on call?",
  },
  {
    id: 7,
    category: "Infrastructure",
    domain: "Anganwadi",
    question: "Are all Anganwadis constructed and functional?",
  },
  {
    id: 8,
    category: "Infrastructure",
    domain: "Roads",
    question: "Is the village connected by all‑weather roads?",
  },
  {
    id: 9,
    category: "Infrastructure",
    domain: "Electricity",
    question: "Is the village fully electrified?",
  },
  {
    id: 10,
    category: "Infrastructure",
    domain: "Digitization",
    question: "Is internet connectivity available in the village?",
  }
];

export const HOUSEHOLD_QUESTIONS = [
  {
    id: 11,
    category: "Household",
    domain: "Toilets",
    question: "Do households have individual toilets (IHHL)?",
  },
  {
    id: 12,
    category: "Household",
    domain: "Sanitation",
    question: "Are people still defecating in the open?",
  },
  {
    id: 13,
    category: "Household",
    domain: "Education",
    question: "Are children (6–14) attending school?",
  },
  {
    id: 14,
    category: "Household",
    domain: "Health",
    question: "Are households covered under any health protection scheme?",
  },
  {
    id: 15,
    category: "Household",
    domain: "Health",
    question: "Are pregnant women severely anaemic?",
  },
  {
    id: 16,
    category: "Household",
    domain: "Health",
    question: "Are children fully immunized (<1 year)?",
  },
  {
    id: 17,
    category: "Household",
    domain: "Social Security",
    question: "Do eligible women receive widow pension?",
  },
  {
    id: 18,
    category: "Household",
    domain: "Housing",
    question: "Do households live in unsafe / kachcha houses?",
  },
  {
    id: 19,
    category: "Household",
    domain: "Electricity & Fuel",
    question: "Do households have electricity connection?",
  },
  {
    id: 20,
    category: "Household",
    domain: "Financial Inclusion",
    question: "Do households have bank/post office accounts?",
  }
];

// =========================
// GET QUESTIONS
// =========================
export const getSurveyQuestions = async (req, res) => {
  try {
    res.json({ success: true, householdQuestions: HOUSEHOLD_QUESTIONS, infrastructureQuestions: INFRA_QUESTIONS });
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

    if (!villageId)
      return res.status(400).json({ success: false, message: "Village not linked with user" });

    const exists = await House.findOne({ village: villageId, houseNumber });
    if (exists)
      return res.status(400).json({ success: false, message: "House already exists" });

    // Accept optional members data when creating a house
    const { members, membersCount, address } = req.body;

    if (members && !Array.isArray(members)) {
      return res.status(400).json({ success: false, message: "Members must be an array of names" });
    }

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
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
};

// =========================
// SUBMIT SURVEY
// =========================
export const submitSurvey = async (req, res) => {
  try {
    const villageId = req.user.village;
    const { houseId, householdAnswers, infrastructureAnswers, surveyorName, members, membersCount } = req.body;

    if (!villageId)
      return res.status(400).json({ success: false, message: "Village not linked" });

    const house = await House.findById(houseId);
    if (!house)
      return res.status(404).json({ success: false, message: "House not found" });

    // If the request contains updated members info, validate and update house before saving survey
    let updatedHouse = house;
    if (members) {
      if (!Array.isArray(members)) {
        return res.status(400).json({ success: false, message: "Members must be an array of names" });
      }

      const newCount = members.length || (membersCount ? Number(membersCount) : 0);
      updatedHouse = await House.findByIdAndUpdate(
        houseId,
        { members, membersCount: newCount },
        { new: true }
      );
    }

    // Format household questions with answers
    const formattedHouseholdQuestions = HOUSEHOLD_QUESTIONS.map((q, idx) => ({
      indicatorId: `Q${q.id}`,
      domain: q.domain,
      scheme: q.category,
      question: q.question,
      answer: householdAnswers && Array.isArray(householdAnswers) ? householdAnswers[idx] || "no" : "no",
      remark: ""
    }));

    // Format infrastructure questions with answers
    const formattedInfraQuestions = INFRA_QUESTIONS.map((q, idx) => ({
      indicatorId: `Q${q.id}`,
      domain: q.domain,
      question: q.question,
      answer: infrastructureAnswers && Array.isArray(infrastructureAnswers) ? infrastructureAnswers[idx] || "no" : "no",
      remark: ""
    }));

    // Determine surveyor name (prefer provided name, else logged-in user's fullName)
    const surveyor = surveyorName || (req.user && req.user.fullName) || "";

    const survey = await Survey.create({
      house: houseId,
      village: villageId,
      householdQuestions: formattedHouseholdQuestions,
      infrastructureQuestions: formattedInfraQuestions,
      status: "completed",
      surveyTakenBy: { name: surveyor, user: req.user ? req.user._id : undefined },
      members: updatedHouse.members || [],
      membersCount: updatedHouse.membersCount || 0
    });

    // Mark house surveyStatus completed
    await House.findByIdAndUpdate(houseId, { surveyStatus: "completed" });

    res.json({ success: true, message: "Survey submitted", survey });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================
// GET MY SURVEYS
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
