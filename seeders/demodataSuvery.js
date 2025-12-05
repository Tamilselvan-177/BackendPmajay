// seeders/multiVillageSeeder.js - FIXED VERSION
import mongoose from "mongoose";
import Village from "../models/Village.js";
import House from "../models/House.js";
import Survey from "../models/Survey.js";
import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";

console.log("⏳ Connecting to MongoDB...");
await mongoose.connect("mongodb://127.0.0.1:27017/pmajay");
console.log("📌 Connected!");

const BLOCK_ID = "6925b40c6caec3c330b54f13";

const VILLAGES = [
  { name: "Red Village 1", target: "red" },
  { name: "Yellow Village", target: "yellow" },
  { name: "Green Village", target: "green" },
  { name: "Red Village 2", target: "red" }
];

// ------------------------------
// Generate percentage based on target with more variation
// ------------------------------
function pct(target) {
  if (target === "red") return Math.floor(Math.random() * 45);        // 0–44%
  if (target === "yellow") return 45 + Math.floor(Math.random() * 30); // 45–74%
  if (target === "green") return 75 + Math.floor(Math.random() * 25);  // 75–99%
}

// ------------------------------
// Compute score for an indicator (matches your scoring.js logic)
// ------------------------------
function computeScore(indicator) {
  if (indicator.answerType === "yes_no") {
    return indicator.answer === "yes" ? 2 : 0;
  }
  if (indicator.answerType === "percentage") {
    const p = indicator.percentage ?? 0;
    if (p > 75) return 2;
    if (p >= 50 && p <= 75) return 1;
    return 0;
  }
  return 0;
}

// ------------------------------
// Generate indicators with PROPER scoring
// ------------------------------
function generateIndicators(targetColor) {
  const list = [];

  for (const [domainKey, domain] of Object.entries(PMJAY_DOMAINS)) {
    for (const ind of domain.indicators) {
      const obj = {
        indicatorId: ind.id,
        domain: domainKey,
        question: ind.sector,
        answerType: ind.type,
        answer: null,
        percentage: null,
        score: 0
      };

      // Generate answers based on target color
      if (ind.type === "yes_no") {
        if (targetColor === "green") {
          obj.answer = Math.random() > 0.15 ? "yes" : "no"; // 85% yes
        } else if (targetColor === "yellow") {
          obj.answer = Math.random() > 0.4 ? "yes" : "no";  // 60% yes
        } else if (targetColor === "red") {
          obj.answer = Math.random() > 0.7 ? "yes" : "no";  // 30% yes
        }
      }

      if (ind.type === "percentage") {
        obj.percentage = pct(targetColor);
      }

      // ✅ CRITICAL: Compute the score immediately
      obj.score = computeScore(obj);

      list.push(obj);
    }
  }

  return list;
}

// ------------------------------
// Create 5 houses per village
// ------------------------------
async function createHouses(villageId) {
  const ids = [];

  for (let i = 1; i <= 5; i++) {
    const h = await House.create({
      village: villageId,
      houseNumber: `H-${i}`,
      members: ["Person A", "Person B"],
      membersCount: 2,
      createdBy: new mongoose.Types.ObjectId(),
      surveyStatus: "completed"
    });
    ids.push(h._id);
  }

  return ids;
}

// ------------------------------
// Create surveys with VARIATION per house
// ------------------------------
async function createSurveys(houseIds, villageId, targetColor) {
  for (const h of houseIds) {
    // ✅ Generate NEW indicators for each house (adds variation)
    const indicators = generateIndicators(targetColor);

    const s = new Survey({
      house: h,
      village: villageId,
      indicators,
      status: "completed",
      surveyTakenBy: {
        name: "Seeder Bot",
        user: new mongoose.Types.ObjectId()
      },
      members: ["Auto", "Generated"],
      membersCount: 2
    });

    // ✅ The pre-save hook will now work because indicators have scores
    await s.save();
    
    console.log(`  📋 Survey created with overall score: ${s.overallScore}`);
  }
}

// ------------------------------
// MAIN RUN
// ------------------------------
async function run() {
  console.log("🧹 Clearing old data...");
  await Survey.deleteMany({});
  await House.deleteMany({});
  await Village.deleteMany({});

  console.log("🏡 Seeding villages...");

  for (const v of VILLAGES) {
    const id = new mongoose.Types.ObjectId();

    await Village.create({
      _id: id,
      name: v.name,
      block: BLOCK_ID,
      totalPopulation: 2000 + Math.floor(Math.random() * 1000),
      scPopulation: { count: 500 },
      location: { 
        lat: 12.90 + Math.random() / 100, 
        lng: 79.08 + Math.random() / 100 
      }
    });

    console.log(`🌍 Creating ${v.name} (target: ${v.target})...`);
    const houses = await createHouses(id);
    await createSurveys(houses, id, v.target);

    console.log(`✅ ${v.name} completed\n`);
  }

  console.log("🎉 DONE — All 4 villages seeded with varied scores!");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});