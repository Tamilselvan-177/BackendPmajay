import mongoose from "mongoose";
import User from "../models/User.js";
import State from "../models/State.js";
import District from "../models/District.js";
import Block from "../models/Block.js";
import Village from "../models/Village.js";

const MONGO_URI =
  "mongodb+srv://aktamil13_db_user:ujfUDonvei51P9oX@pmajay.oyfu34s.mongodb.net/?retryWrites=true&w=majority&appName=pmajay";
// const MONGO_URI = "mongodb://127.0.0.1:27017/pmajay"
const seedUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    // OPTIONAL: Clear old user data
    await User.deleteMany({});
    console.log("🗑 Old users removed");

    // Fetch location references
    const stateTN = await State.findOne({ name: "TamilNadu" });
    const districtKanchi = await District.findOne({ name: "Kanchipuram" });
    const blockKanchi = await Block.findOne({ name: "Kanchipuram" });
    const villagePutheyri = await Village.findOne({ name: "Putheyri" });

    if (!stateTN || !districtKanchi || !blockKanchi || !villagePutheyri) {
      console.log("❌ Required location entities missing. Seed locations first.");
      process.exit(1);
    }

    // ---------------------------
    // CREATE USERS
    // ---------------------------

    // Prime Minister
    const pm = await User.create({
      username: "pmindia",
      password: "primeminister",
      role: "primeminister",
      fullName: "PM AJAY",
      email: "pm@gmail.com",
      phone: "7777777777",
      isActive: true,
    });

    // Collector
    const collector = await User.create({
      username: "collector123",
      password: "password123",
      role: "collector",
      fullName: "District Collector",
      email: "collector@gmail.com",
      phone: "9999999999",
      state: stateTN._id,
      district: districtKanchi._id,
      isActive: true,
    });

    // Officer
    const officer = await User.create({
      username: "officer123",
      password: "password123",
      role: "officer",
      fullName: "Officer Sakthi",
      email: "officer@gmail.com",
      phone: "8888888888",
      state: stateTN._id,
      district: districtKanchi._id,
      block: blockKanchi._id,
      village: villagePutheyri._id,
      assignedCollector: collector._id,
      isActive: true,
    });

    // Village User (NEW)
    const villager = await User.create({
      username: "village123",
      password: "password123",
      role: "village",
      fullName: "Village Admin",
      email: "village001@gmail.com",
      phone: "6666666666",
      state: stateTN._id,
      district: districtKanchi._id,
      block: blockKanchi._id,
      village: villagePutheyri._id,
      assignedCollector: collector._id, // connected to same collector
      isActive: true,
    });

    console.log("🌱 Users Seeded Successfully");
    console.log({ pm, collector, officer, villager });

    process.exit();
  } catch (err) {
    console.error("❌ User Seed Error:", err);
    process.exit(1);
  }
};

seedUsers();
