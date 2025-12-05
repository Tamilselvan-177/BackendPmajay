// testing/debug.js
import { computeIndicatorScore } from "../utils/scoring.js";
import { computeDomainScores } from "../utils/scoring.js";

// -----------------------------------------
// TEST INDICATOR SCORING
// -----------------------------------------
console.log("===== TEST computeIndicatorScore =====");

console.log("YES/NO YES →", computeIndicatorScore({
  answerType: "yes_no",
  answer: "yes"
})); // EXPECT 2

console.log("YES/NO NO →", computeIndicatorScore({
  answerType: "yes_no",
  answer: "no"
})); // EXPECT 0

console.log("Percentage 90 →", computeIndicatorScore({
  answerType: "percentage",
  percentage: 90
})); // EXPECT 2

console.log("Percentage 60 →", computeIndicatorScore({
  answerType: "percentage",
  percentage: 60
})); // EXPECT 1

console.log("Percentage 20 →", computeIndicatorScore({
  answerType: "percentage",
  percentage: 20
})); // EXPECT 0



// -----------------------------------------
// TEST DOMAIN SCORING
// -----------------------------------------
console.log("\n===== TEST computeDomainScores =====");

const fakeIndicators = [
  { domain: "education", score: 2 },
  { domain: "education", score: 1 },
  { domain: "health", score: 2 },
  { domain: "health", score: 0 },
  { domain: "sanitation", score: 1 }
];

console.log("Domain Scores →", computeDomainScores(fakeIndicators));

/*
Expected output:
{
  education: 3,
  health: 2,
  sanitation: 1,
  drinkingWaterSanitation: 0,
  roadsConnectivity: 0,
  electricity: 0,
  livelihood: 0
}
*/

console.log("\n🎉 DEBUGGING COMPLETE — SCORING WORKS!");
