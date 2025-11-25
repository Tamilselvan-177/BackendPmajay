import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import State from "../models/State.js";
import District from "../models/District.js";
import Block from "../models/block.js";
import Village from "../models/Village.js";

await connectDB();

try {
  console.log("🗑 Clearing old villages...");
  await Village.deleteMany({});
  await Block.deleteMany({});
  await District.deleteMany({});
  await State.deleteMany({});

  const tN = await State.create({ name: "TamilNadu" });
  const kanchi = await District.create({ name: "Kanchipuram", state: tN._id });
  const kanchiBlk = await Block.create({ name: "Kanchipuram", district: kanchi._id });

  const putheyri = await Village.create({ name: "Putheyri", block: kanchiBlk._id });

  console.log("🌱 Seeded Successfully", { putheyri });
  process.exit(0);

} catch (error) {
  console.log("❌ Seed Error:", error);
  process.exit(1);
}
