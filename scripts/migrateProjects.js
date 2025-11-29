// scripts/migrateProjects.js
// Run this script ONCE to update existing projects with new verification fields

import mongoose from "mongoose";
import Project from "../models/Project.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/pmajay"; // 👈 DIRECT CONNECTION

const migrateProjects = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all existing projects
    const projects = await Project.find({});
    console.log(`📊 Found ${projects.length} existing projects`);

    let updated = 0;

    for (const project of projects) {
      // Add new fields if they don't exist
      if (!project.assignedScheme) project.assignedScheme = null;
      if (!project.verificationCount) project.verificationCount = 0;
      if (!project.lastVerifiedAt) project.lastVerifiedAt = null;
      if (!project.currentProgress) project.currentProgress = 0;
      if (!project.currentStatus) project.currentStatus = "not_started";
      if (!project.verificationFrequency) project.verificationFrequency = "weekly";
      if (!project.customFrequencyDays) project.customFrequencyDays = 7;
      if (project.needsVerification === undefined) project.needsVerification = true;
      if (!project.verificationOverdueDays) project.verificationOverdueDays = 0;

      await project.save();
      updated++;
      console.log(`✅ Updated: ${project.projectName}`);
    }

    console.log(`\n🎉 Migration completed! Updated ${updated} projects.`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateProjects();
