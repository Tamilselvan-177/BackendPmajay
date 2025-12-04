// services/priorityCalculator.js
import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";

// ========================================
// MAIN PRIORITY CALCULATION ENGINE
// ========================================
export const calculateVillagePriority = async (surveys, village) => {
  if (surveys.length === 0) return null;

  // 1️⃣ AGGREGATE DOMAIN SCORES ACROSS ALL SURVEYS
  const domainScores = {};
  Object.keys(PMJAY_DOMAINS).forEach(domainKey => {
    const domainConfig = PMJAY_DOMAINS[domainKey];
    const domainMax = domainConfig.maxScore * surveys.length;

    const totalScore = surveys.reduce((sum, survey) => {
      return sum + (survey.domainScores?.[domainKey] || 0);
    }, 0);

    const percentage = (totalScore / domainMax) * 100;
    const gap = domainMax - totalScore;

    domainScores[domainKey] = {
      score: totalScore,
      maxScore: domainConfig.maxScore,
      percentage: Math.round(percentage * 100) / 100,
      gap: gap
    };
  });

  // 2️⃣ CALCULATE OVERALL READINESS (Average across domains)
  const overallPercentages = Object.values(domainScores).map(d => d.percentage);
  const overallReadiness = Math.round(
    overallPercentages.reduce((a, b) => a + b, 0) / overallPercentages.length
  );

  // 3️⃣ CLASSIFY PRIORITY & COLOR (Drishti System)
  let priority = "ready";
  let color = "green";

  if (overallReadiness < 50) {
    priority = "critical";
    color = "red";
  } else if (overallReadiness < 80) {
    priority = "high";
    color = "yellow";
  } else {
    priority = "ready";
    color = "green";
  }

  // 4️⃣ EXTRACT TOP 3 GAPS (Highest project demand)
  const topGaps = Object.entries(domainScores)
    .map(([domain, data]) => ({
      domain,
      gapPercentage: Math.round((100 - data.percentage) * 100) / 100,
      gap: data.gap,
      suggestedBudget: Math.ceil(data.gap * 50000) // ₹50k per missing score point
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  // 5️⃣ RECOMMEND PROJECTS BASED ON TOP GAPS
  const recommendedProjects = topGaps.map(gap => ({
    projectType: mapDomainToProject(gap.domain),
    urgency: gap.gapPercentage > 50 ? "urgent" : "high",
    estimatedCost: gap.suggestedBudget,
    relatedScheme: getRelatedScheme(gap.domain)
  }));

  return {
    village: village._id,
    villageName: village.name || "Unknown Village",
    domainScores,
    overallReadiness,
    priority,
    color,
    topGaps,
    recommendedProjects,
    totalSurveys: surveys.length,
    lastUpdated: new Date()
  };
};

// ========================================
// DOMAIN → PROJECT MAPPING
// ========================================
function mapDomainToProject(domain) {
  const mapping = {
    drinkingWaterSanitation: "Water Supply System",
    education: "School Infrastructure",
    health: "Primary Health Center",
    roadsConnectivity: "Road Construction",
    electricity: "Solar Electrification",
    livelihood: "Skill Development Center",
    sanitation: "Waste Management System",
    socialSecurity: "Community Hall",
    sports: "Sports Ground"
  };
  return mapping[domain] || "Infrastructure Development";
}

// ========================================
// DOMAIN → GOVERNMENT SCHEME MAPPING
// ========================================
function getRelatedScheme(domain) {
  const schemeMapping = {
    drinkingWaterSanitation: "Jal Jeevan Mission",
    roadsConnectivity: "PM Gram Sadak Yojana (PMGSY)",
    electricity: "Saubhagya Scheme",
    education: "PM Poshan Shakti Nirman",
    health: "National Health Mission (NHM)",
    livelihood: "National Rural Livelihood Mission (NRLM)",
    sanitation: "Swachh Bharat Mission",
    socialSecurity: "PM Awas Yojana",
    sports: "Khelo India"
  };
  return schemeMapping[domain] || "PM-AJAY Integrated Development";
}

// ========================================
// PRIORITY SCORING ALGORITHM (for sorting)
// ========================================
export function calculatePriorityScore(domainScores, village) {
  const weights = {
    drinkingWaterSanitation: 0.25,  // Highest weight - basic need
    roadsConnectivity: 0.20,        // Critical connectivity
    electricity: 0.15,              // Essential service
    health: 0.15,                   // Health priority
    education: 0.10,                // Education
    sanitation: 0.10,               // Hygiene
    livelihood: 0.05                // Economic
  };

  return Object.entries(domainScores).reduce((total, [domain, data]) => {
    const gap = 100 - data.percentage;
    const weight = weights[domain] || 0.05;
    return total + (gap * weight);
  }, 0);
}

// ========================================
// BACKWARD COMPATIBILITY (if PMJAY_DOMAINS not available)
// ========================================
export const getDefaultDomains = () => ({
  drinkingWaterSanitation: { maxScore: 10, name: "Water & Sanitation" },
  education: { maxScore: 8, name: "Education" },
  health: { maxScore: 6, name: "Health" },
  roadsConnectivity: { maxScore: 10, name: "Roads" },
  electricity: { maxScore: 6, name: "Electricity" },
  livelihood: { maxScore: 4, name: "Livelihood" },
  sanitation: { maxScore: 6, name: "Sanitation" }
});
