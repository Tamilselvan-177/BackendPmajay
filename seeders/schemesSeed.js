import mongoose from "mongoose";
import Scheme from "../models/Scheme.js";

const MONGO_URI =
  "mongodb+srv://aktamil13_db_user:ujfUDonvei51P9oX@pmajay.oyfu34s.mongodb.net/?retryWrites=true&w=majority&appName=pmajay";
// const MONGO_URI = "mongodb://127.0.0.1:27017/pmajay";

const schemes = [
  { schemeName: "Swachh Bharat Mission (Gramin)", description: "Construction of toilets and sanitation improvement.", budgetLimit: 1000000 },
  { schemeName: "Pradhan Mantri Awas Yojana (Gramin)", description: "Affordable housing for rural beneficiaries.", budgetLimit: 1200000 },
  { schemeName: "MGNREGA Rural Employment Mission", description: "100 days employment guarantee program.", budgetLimit: 3000000 },
  { schemeName: "Pradhan Mantri Gram Sadak Yojana (PMGSY)", description: "Village road and connectivity development.", budgetLimit: 5000000 },
  { schemeName: "Jal Jeevan Mission", description: "Tap water connection to every house.", budgetLimit: 2500000 },
  { schemeName: "PM Krishi Sinchayee Yojana", description: "Agricultural irrigation improvement.", budgetLimit: 1800000 },
  { schemeName: "National Rural Livelihood Mission (NRLM)", description: "Self Help Group support for rural women.", budgetLimit: 800000 },
  { schemeName: "Ayushman Bharat - PM-JAY", description: "Health infrastructure upgrade and Ayushman card support.", budgetLimit: 4500000 },
  { schemeName: "Solar Village Electrification Scheme", description: "Solar street lights & general electrification.", budgetLimit: 1400000 },
  { schemeName: "PM FME (Micro Enterprises)", description: "Food processing and mini-factory support.", budgetLimit: 2000000 },
  { schemeName: "Rural School Upgradation Mission", description: "School buildings, toilets & smart classrooms.", budgetLimit: 3500000 },
  { schemeName: "Rural Hospital & PHC Modernization", description: "Primary health center renovation & supplies.", budgetLimit: 8000000 },
  { schemeName: "Border Area Village Development", description: "Border region village infrastructure improvement.", budgetLimit: 5500000 },
  { schemeName: "Smart Village Digital India Programme", description: "Wi-Fi, CSC center, LED lights, CCTV, smart governance.", budgetLimit: 5000000 },
  { schemeName: "PM Suraksha Bima Awareness Campaign", description: "Insurance health camps & awareness.", budgetLimit: 400000 },
  { schemeName: "PM Garib Kalyan Anna Guarantee", description: "Free ration distribution infra setup.", budgetLimit: 400000 },
  { schemeName: "PM Modi Employment Skill Mission", description: "Skill centers & training infra.", budgetLimit: 600000 },
  { schemeName: "PM Green India Plantation Drive", description: "Forest cover planting & waste land conversion.", budgetLimit: 1000000 },
  { schemeName: "Village Market Storage & Cold Room", description: "Storage, cold chains & food logistics facility.", budgetLimit: 6000000 },
  { schemeName: "PM Matsya Sampada Yojana", description: "Aquaculture & fish ponds infra.", budgetLimit: 1400000 },
  { schemeName: "PM National Health Mission (NHM)", description: "Ambulance, equipment & rural clinics.", budgetLimit: 5000000 },
  { schemeName: "Rashtriya Gram Swaraj Abhiyan", description: "Panchayat building improvement.", budgetLimit: 1600000 },
  { schemeName: "PM E-Library Digital Literacy", description: "Public libraries & educational ICT rooms.", budgetLimit: 2500000 },
  { schemeName: "PM Agricultural Warehouse Facility", description: "Warehouse, grain storage units.", budgetLimit: 5800000 },
  { schemeName: "Village Stadium / Sports Complex", description: "Rural sports infra & playground development.", budgetLimit: 3200000 },
  { schemeName: "Village Drinking Water Tank Project", description: "Overhead tanks and water pumping units.", budgetLimit: 4000000 },
  { schemeName: "Village Drainage & Sewage System", description: "Drainage networks & waste facility.", budgetLimit: 2700000 },
  { schemeName: "Women Welfare Self Employment Hub", description: "Tailoring, dairy training infrastructure.", budgetLimit: 1100000 },
  { schemeName: "Village Animal Care Veterinary Center", description: "Veterinary clinic and animal treatment building.", budgetLimit: 2000000 },
  { schemeName: "PM Rural Transportation Mini-Bus Scheme", description: "Transport for students & workers.", budgetLimit: 3600000 }
];




const seedSchemes = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🚀 MongoDB Connected");

    await Scheme.deleteMany({});
    console.log("🗑 Old schemes removed");

    await Scheme.insertMany(schemes);
    console.log("🌱 30 Schemes Inserted Successfully");

    mongoose.connection.close();
    console.log("🔌 Connection Closed");
  } catch (err) {
    console.error("❌ Seeding Failed:", err);
    mongoose.connection.close();
  }
};

seedSchemes();
