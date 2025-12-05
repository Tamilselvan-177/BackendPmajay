export const PMJAY_DOMAINS = {
  drinkingWaterSanitation: {
    name: "Drinking Water & Sanitation",
    maxScore: 16,
    indicators: [
      { id: "DW1", sector: "drinkingWater", type: "yes_no", question: "Is safe drinking water available in the village?" },
      { id: "DW2", sector: "cleanWater", type: "percentage", question: "What percentage of households have access to clean water?" },
      { id: "DW3", sector: "IHHL", type: "yes_no", question: "Do households have Individual Household Latrines (IHHL)?" },
      { id: "DW4", sector: "schoolToilets", type: "yes_no", question: "Are school toilets available and functional?" },
      { id: "DW5", sector: "ODF", type: "percentage", question: "What percentage of the village is Open Defecation Free (ODF)?" },
      { id: "DW6", sector: "drains", type: "yes_no", question: "Are proper drainage systems available?" },
      { id: "DW7", sector: "drainsFunctioning", type: "percentage", question: "What percentage of drains are functioning properly?" },
      { id: "DW8", sector: "wasteManagement", type: "yes_no", question: "Is solid waste management available in the village?" }
    ]
  },

  education: {
    name: "Education",
    maxScore: 8,
    indicators: [
      { id: "ED1", sector: "attendance6_10", type: "percentage", question: "What is the student attendance rate for classes 6 to 10?" },
      { id: "ED2", sector: "attendance11_14", type: "percentage", question: "What is the student attendance rate for classes 11 to 14?" },
      { id: "ED3", sector: "girlsAttendance", type: "percentage", question: "What is the attendance rate of girl students?" },
      { id: "ED4", sector: "dropoutRate", type: "percentage", question: "What is the dropout rate in the village?" }
    ]
  },

  health: {
    name: "Health",
    maxScore: 12,
    indicators: [
      { id: "HL1", sector: "ambulanceService", type: "yes_no", question: "Is ambulance service available in the village?" },
      { id: "HL2", sector: "anganwadiFunctioning", type: "yes_no", question: "Is the Anganwadi center functioning properly?" },
      { id: "HL3", sector: "immunization", type: "percentage", question: "What percentage of children are fully immunized?" },
      { id: "HL4", sector: "pregnantWomenAnemia", type: "percentage", question: "What percentage of pregnant women are anemic?" }
    ]
  },

  roadsConnectivity: {
    name: "Roads & Connectivity",
    maxScore: 10,
    indicators: [
      { id: "RC1", sector: "allWeatherRoad", type: "yes_no", question: "Does the village have an all-weather road?" },
      { id: "RC2", sector: "roadConditionGood", type: "percentage", question: "What percentage of village roads are in good condition?" },
      { id: "RC3", sector: "internetConnectivity", type: "yes_no", question: "Is stable internet connectivity available?" },
      { id: "RC4", sector: "mobileNetworkCoverage", type: "yes_no", question: "Is mobile network coverage available in all areas?" }
    ]
  },

  electricity: {
    name: "Electricity",
    maxScore: 6,
    indicators: [
      { id: "EL1", sector: "villageElectrified", type: "yes_no", question: "Is the village fully electrified?" },
      { id: "EL2", sector: "householdElectrified", type: "percentage", question: "What percentage of households have electricity?" },
      { id: "EL3", sector: "solarPanelsInstalled", type: "yes_no", question: "Are solar panels installed in the village?" }
    ]
  },

  livelihood: {
    name: "Livelihood & Skill Development",
    maxScore: 6,
    indicators: [
      { id: "LV1", sector: "skillTrainingAvailable", type: "yes_no", question: "Is skill development training available in the village?" },
      { id: "LV2", sector: "employmentGenerated", type: "percentage", question: "What percentage of people gained employment through programs?" },
      { id: "LV3", sector: "selfHelpGroupsActive", type: "yes_no", question: "Are Self-Help Groups (SHGs) active?" }
    ]
  },

  sanitation: {
    name: "Sanitation & Waste Management",
    maxScore: 8,
    indicators: [
      { id: "SN1", sector: "solidWasteCollection", type: "yes_no", question: "Is solid waste collection carried out regularly?" },
      { id: "SN2", sector: "liquidWasteDisposal", type: "yes_no", question: "Is there a proper liquid waste disposal system?" },
      { id: "SN3", sector: "toiletsFunctional", type: "percentage", question: "What percentage of toilets are functional?" },
      { id: "SN4", sector: "communityCleanliness", type: "percentage", question: "Rate the village's community cleanliness (%)" }
    ]
  }
};
