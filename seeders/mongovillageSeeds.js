// seeders/demodataMultiVillage.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import House from "../models/House.js";
import Survey from "../models/Survey.js";
import Village from "../models/Village.js";
import { PMJAY_DOMAINS } from "../config/pmjayDomains.js";

console.log("⏳ Connecting to MongoDB...");
await mongoose.connect("mongodb://127.0.0.1:27017/pmajay");
console.log("📌 Connected!");

const BLOCK_ID = "6925b40c6caec3c330b54f13";

// -------------------------------------------------------
// VILLAGE DEFINITIONS WITH TARGET READINESS LEVEL
// -------------------------------------------------------
const VILLAGES = [
  { name: "Demo Survey Village", target: "red" },     // <50%
  { name: "North Colony", target: "yellow" },         // 50–80%
  { name: "South Colony", target: "green" },          // >80%
  { name: "Lake Village", target: "red" },
  { name: "Market Area", target: "yellow" }
];

// For each readiness color → generate a score range
function generatePercentage(target) {
  if (target === "red") return Math.floor(Math.random() * 40);     // 0–40%
  if (target === "yellow") return 50 + Math.floor(Math.random() * 30); // 50–79%
  if (target === "green") return 80 + Math.floor(Math.random() * 20);  // 80–100%
}

// -------------------------------------------------------
// CREATE ALL VILLAGES
// -------------------------------------------------------
async function createVillages() {
  const ids = [];

  for (const v of VILLAGES) {
    const newId = new mongoose.Types.ObjectId();
    const res = await Village.create({
      _id: newId,
      name: v.name,
      block: BLOCK_ID,
      totalPopulation: 2000 + Math.floor(Math.random() * 1000),
      scPopulation: { count: 400 + Math.floor(Math.random() * 300) },
      location: { lat: 12.90 + Math.random() / 10, lng: 79.08 + Math.random() / 10 }
    });

    console.log("🏡 Village Created:", v.name, newId.toString());
    ids.push({ id: newId, target: v.target });
  }

  return ids;
}

// -------------------------------------------------------
// HOUSE CREATION (5 houses per village)
// -------------------------------------------------------
async function createHouses(villageId) {
  const houses = [];
  const names = ["Raja", "Priya", "Kumar", "Selvi", "Arun", "Devi", "Kannan"];

  for (let i = 1; i <= 5; i++) {
    const members = [
      names[Math.floor(Math.random() * names.length)],
      names[Math.floor(Math.random() * names.length)]
    ];

    const house = await House.create({
      village: villageId,
      houseNumber: `${i}A`,
      members,
      membersCount: members.length,
      createdBy: new mongoose.Types.ObjectId(),
      surveyStatus: "completed"
    });

    houses.push(house._id);
  }

  return houses;
}

// -------------------------------------------------------
// RANDOM INDICATORS WITH CONTROLLED READINESS
// -------------------------------------------------------
function generateIndicators(targetColor) {
  const indicators = [];

  for (const [domainKey, domain] of Object.entries(PMJAY_DOMAINS)) {
    for (const ind of domain.indicators) {
      const entry = {
        indicatorId: ind.id,
        domain: domainKey,
        question: ind.sector,
        answerType: ind.type,
        answer: null,
        percentage: null,
        score: 0
      };

      if (ind.type === "yes_no") {
        // green → mostly yes, red → mostly no
        if (targetColor === "green") entry.answer = Math.random() > 0.2 ? "yes" : "no";
        if (targetColor === "yellow") entry.answer = Math.random() > 0.5 ? "yes" : "no";
        if (targetColor === "red") entry.answer = Math.random() > 0.8 ? "yes" : "no";
      }

      if (ind.type === "percentage") {
        entry.percentage = generatePercentage(targetColor);
      }

      indicators.push(entry);
    }
  }

  return indicators;
}

// -------------------------------------------------------
// CREATE SURVEYS FOR EACH HOUSE
// -------------------------------------------------------
async function createSurveys(houseIds, villageId, targetColor) {
  for (const houseId of houseIds) {
    const indicators = generateIndicators(targetColor);

    const survey = new Survey({
      house: houseId,
      village: villageId,   // ✅ FIXED
      indicators,
      status: "completed",
      surveyTakenBy: {
        name: "Seeder Bot",
        user: new mongoose.Types.ObjectId()
      },
      members: ["Auto", "Generated"],
      membersCount: 2
    });

    survey.markModified("indicators");
    await survey.save();
  }
}

// -------------------------------------------------------
// RUN SEEDER
// -------------------------------------------------------
async function run() {
  console.log("⚠️ Clearing old data...");
  await Survey.deleteMany({});
  await House.deleteMany({});
  await Village.deleteMany({});
  console.log("🧹 Database Cleared!");

  const villages = await createVillages();

  for (const v of villages) {
    const houseIds = await createHouses(v.id);
await createSurveys(houseIds, v.id, v.target);
  }

  console.log("🎉 DONE — Multi Village Seed Completed!");
  process.exit(0);
}

run();
