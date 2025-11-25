import mongoose from "mongoose";

import State from "../models/State.js";
import District from "../models/District.js";
import Block from "../models/Block.js";
import Village from "../models/Village.js";

// 🔥 Direct MongoDB URL here
const MONGO_URI =
  "mongodb+srv://aktamil13_db_user:ujfUDonvei51P9oX@pmajay.oyfu34s.mongodb.net/?retryWrites=true&w=majority&appName=pmajay";

// Direct connection
const connectDirect = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected Directly");
  } catch (err) {
    console.error("❌ Direct DB Connection Failed:", err);
    process.exit(1);
  }
};

await connectDirect();

try {
  console.log("🗑 Clearing old locations...");
  await Village.deleteMany({});
  await Block.deleteMany({});
  await District.deleteMany({});
  await State.deleteMany({});

  console.log("🌱 Creating new location hierarchy...");

  // STATE
  const tN = await State.create({ name: "TamilNadu" });

  // DISTRICT
  const kanchi = await District.create({
    name: "Kanchipuram",
    state: tN._id,
  });

  // BLOCK
  const kanchiBlk = await Block.create({
    name: "Kanchipuram",
    district: kanchi._id,
  });

  // VILLAGE
  const putheyri = await Village.create({
    name: "Putheyri",
    block: kanchiBlk._id,
  });

  console.log("🌱 Seeded Successfully:", {
    state: tN,
    district: kanchi,
    block: kanchiBlk,
    village: putheyri,
  });

  process.exit(0);
} catch (error) {
  console.error("❌ Seed Error:", error);
  process.exit(1);
}
