// config/pmjayDomains.js
export const PMJAY_DOMAINS = {
  drinkingWaterSanitation: {
    name: "Drinking Water & Sanitation",
    maxScore: 16,
    indicators: [
      { id: "DW1", sector: "drinkingWater", type: "yes_no" },
      { id: "DW2", sector: "cleanWater", type: "percentage" },
      { id: "DW3", sector: "IHHL", type: "yes_no" }, // Individual Household Latrine
      { id: "DW4", sector: "schoolToilets", type: "yes_no" },
      { id: "DW5", sector: "ODF", type: "percentage" }, // Open Defecation Free
      { id: "DW6", sector: "drains", type: "yes_no" },
      { id: "DW7", sector: "drainsFunctioning", type: "percentage" },
      { id: "DW8", sector: "wasteManagement", type: "yes_no" }
    ]
  },
  education: {
    name: "Education",
    maxScore: 8,
    indicators: [
      { id: "ED1", sector: "attendance6_10", type: "percentage" },
      { id: "ED2", sector: "attendance11_14", type: "percentage" },
      { id: "ED3", sector: "girlsAttendance", type: "percentage" },
      { id: "ED4", sector: "dropoutRate", type: "percentage" }
    ]
  },
  health: {
    name: "Health",
    maxScore: 12,
    indicators: [
      { id: "HL1", sector: "ambulanceService", type: "yes_no" },
      { id: "HL2", sector: "anganwadiFunctioning", type: "yes_no" },
      { id: "HL3", sector: "immunization", type: "percentage" },
      { id: "HL4", sector: "pregnantWomenAnemia", type: "percentage" }
    ]
  },
  roadsConnectivity: {
    name: "Roads & Connectivity",
    maxScore: 10,
    indicators: [
      { id: "RC1", sector: "allWeatherRoad", type: "yes_no" },
      { id: "RC2", sector: "roadConditionGood", type: "percentage" },
      { id: "RC3", sector: "internetConnectivity", type: "yes_no" },
      { id: "RC4", sector: "mobileNetworkCoverage", type: "yes_no" }
    ]
  },
  electricity: {
    name: "Electricity",
    maxScore: 6,
    indicators: [
      { id: "EL1", sector: "villageElectrified", type: "yes_no" },
      { id: "EL2", sector: "householdElectrified", type: "percentage" },
      { id: "EL3", sector: "solarPanelsInstalled", type: "yes_no" }
    ]
  },
  livelihood: {
    name: "Livelihood & Skill Development",
    maxScore: 6,
    indicators: [
      { id: "LV1", sector: "skillTrainingAvailable", type: "yes_no" },
      { id: "LV2", sector: "employmentGenerated", type: "percentage" },
      { id: "LV3", sector: "selfHelpGroupsActive", type: "yes_no" }
    ]
  },
  sanitation: {
    name: "Sanitation & Waste Management",
    maxScore: 8,
    indicators: [
      { id: "SN1", sector: "solidWasteCollection", type: "yes_no" },
      { id: "SN2", sector: "liquidWasteDisposal", type: "yes_no" },
      { id: "SN3", sector: "toiletsFunctional", type: "percentage" },
      { id: "SN4", sector: "communityCleanliness", type: "percentage" }
    ]
  }
};
