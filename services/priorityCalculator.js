// services/priorityCalculator.js - FIXED VERSION
import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";

/**
 * Calculate village readiness from all surveys
 * @param {Array} surveys - Array of Survey documents
 * @param {Object} villageDoc - Village document
 * @returns {Object} - Readiness data with scores, gaps, priorities
 */
export async function calculateVillagePriority(surveys, villageDoc) {
  
  if (!surveys || surveys.length === 0) {
    return createEmptyReadiness(villageDoc);
  }

  // ========================================
  // 1️⃣ AGGREGATE DOMAIN SCORES ACROSS ALL SURVEYS
  // ========================================
  const domainTotals = {};
  const domainCounts = {};

  // Initialize counters
  Object.keys(PMJAY_DOMAINS).forEach(domainKey => {
    domainTotals[domainKey] = 0;
    domainCounts[domainKey] = 0;
  });

  // Sum up scores from each survey's indicators
  surveys.forEach(survey => {
    if (!survey.indicators || survey.indicators.length === 0) return;

    survey.indicators.forEach(ind => {
      if (ind.domain && domainTotals.hasOwnProperty(ind.domain)) {
        domainTotals[ind.domain] += (ind.score || 0);
        domainCounts[ind.domain]++;
      }
    });
  });

  // ========================================
  // 2️⃣ CALCULATE AVERAGE SCORES & PERCENTAGES
  // ========================================
  const domainScores = {};
  let totalScore = 0;
  let totalMaxScore = 0;

  Object.keys(PMJAY_DOMAINS).forEach(domainKey => {
    const domain = PMJAY_DOMAINS[domainKey];
    const maxScore = domain.maxScore;
    const indicatorCount = domain.indicators.length;
    
    // Average score across all surveys for this domain
    const avgScore = domainCounts[domainKey] > 0 
      ? domainTotals[domainKey] / surveys.length 
      : 0;

    // Percentage = (avgScore / maxScore) * 100
    const percentage = maxScore > 0 
      ? Math.round((avgScore / maxScore) * 100) 
      : 0;

    // Gap = maxScore - avgScore (in points)
    const gap = Math.max(0, maxScore - avgScore);

    domainScores[domainKey] = {
      score: Math.round(avgScore * 10) / 10, // Round to 1 decimal
      maxScore: maxScore,
      percentage: percentage,
      gap: Math.round(gap * 10) / 10
    };

    totalScore += avgScore;
    totalMaxScore += maxScore;
  });

  // ========================================
  // 3️⃣ CALCULATE OVERALL READINESS
  // ========================================
  const overallReadiness = totalMaxScore > 0 
    ? Math.round((totalScore / totalMaxScore) * 100) 
    : 0;

  // ========================================
  // 4️⃣ DETERMINE PRIORITY & COLOR
  // ========================================
  let priority, color;
  
  if (overallReadiness < 40) {
    priority = "critical";
    color = "red";
  } else if (overallReadiness >= 40 && overallReadiness < 70) {
    priority = "moderate";
    color = "yellow";
  } else {
    priority = "ready";
    color = "green";
  }

  // ========================================
  // 5️⃣ IDENTIFY TOP GAPS (for project recommendations)
  // ========================================
  const topGaps = Object.entries(domainScores)
    .filter(([_, d]) => d.percentage < 70) // Only domains below 70%
    .sort((a, b) => b[1].gap - a[1].gap) // Sort by gap size
    .slice(0, 5)
    .map(([domain, data]) => ({
      domain,
      domainName: PMJAY_DOMAINS[domain]?.name || domain,
      gapPercentage: 100 - data.percentage,
      gapPoints: data.gap,
      suggestedBudget: estimateBudget(domain, data.gap, villageDoc)
    }));

  // ========================================
  // 6️⃣ RECOMMEND PROJECTS
  // ========================================
  const recommendedProjects = topGaps.map(gap => ({
    domain: gap.domain,
    domainName: gap.domainName,
    projectType: getProjectType(gap.domain),
    estimatedBudget: gap.suggestedBudget,
    priority: gap.gapPercentage > 50 ? "high" : "medium"
  }));

  // ========================================
  // 7️⃣ PRIORITY SCORE (for sorting)
  // ========================================
  const scPopulation = villageDoc.scPopulation?.count || 0;
  const priorityScore = calculatePriorityScore(
    overallReadiness, 
    scPopulation, 
    topGaps
  );

  // ========================================
  // 8️⃣ RETURN COMPLETE READINESS DATA
  // ========================================
  return {
    village: villageDoc._id,
    villageName: villageDoc.name,
    overallReadiness,
    domainScores,
    priority,
    color,
    priorityScore,
    totalSurveys: surveys.length,
    topGaps,
    recommendedProjects,
    scPopulation,
    lastUpdated: new Date()
  };
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function createEmptyReadiness(villageDoc) {
  const domainZeros = Object.fromEntries(
    Object.keys(PMJAY_DOMAINS).map(key => [
      key,
      { 
        score: 0, 
        maxScore: PMJAY_DOMAINS[key].maxScore, 
        percentage: 0, 
        gap: PMJAY_DOMAINS[key].maxScore 
      }
    ])
  );

  return {
    village: villageDoc._id,
    villageName: villageDoc.name,
    overallReadiness: 0,
    domainScores: domainZeros,
    priority: "unknown",
    color: "gray",
    priorityScore: 0,
    totalSurveys: 0,
    topGaps: [],
    recommendedProjects: [],
    scPopulation: villageDoc.scPopulation?.count || 0,
    lastUpdated: new Date()
  };
}

function estimateBudget(domain, gapPoints, villageDoc) {
  // Budget estimation per domain (₹ per gap point per household)
  const budgetPerPoint = {
    drinkingWaterSanitation: 50000,
    education: 30000,
    health: 40000,
    roadsConnectivity: 100000,
    electricity: 25000,
    livelihood: 20000,
    sanitation: 35000
  };

  const baseAmount = budgetPerPoint[domain] || 30000;
  const scPop = villageDoc.scPopulation?.count || 100;
  
  // Estimate: base amount × gap × population factor
  return Math.round(baseAmount * gapPoints * (scPop / 100));
}

function getProjectType(domain) {
  const projectTypes = {
    drinkingWaterSanitation: "Water Supply & Sanitation Infrastructure",
    education: "School Infrastructure & Digital Learning",
    health: "Primary Health Center Upgrade",
    roadsConnectivity: "Village Road Construction/Repair",
    electricity: "Grid Extension & Solar Installation",
    livelihood: "Skill Development & Employment Programs",
    sanitation: "Toilet Construction & Waste Management"
  };

  return projectTypes[domain] || "General Development";
}

function calculatePriorityScore(readiness, scPopulation, topGaps) {
  // Priority score formula:
  // Higher score = more urgent
  // Factors: low readiness, high SC population, large gaps
  
  const readinessFactor = 100 - readiness; // Lower readiness = higher priority
  const populationFactor = scPopulation / 100; // Normalize population
  const gapFactor = topGaps.length > 0 ? topGaps[0].gapPercentage : 0;

  return Math.round(
    (readinessFactor * 0.5) + 
    (populationFactor * 0.3) + 
    (gapFactor * 0.2)
  );
}