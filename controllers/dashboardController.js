// controllers/dashboardController.js - UPDATED FOR DUAL ACCESS
import Survey from "../models/Survey.js";
import VillageReadiness from "../models/VillageReadiness.js";
import Village from "../models/Village.js";
import { calculateVillagePriority } from "../services/priorityCalculator.js";

// ========================================
// DUAL ACCESS: Collector (District) | Officer (Block/Village)
// ========================================
export const getDistrictHeatmap = async (req, res) => {
  try {
    const { role, district, block, village } = req.user;

    if (!["collector", "officer"].includes(role)) {
      return res.status(403).json({ message: "Only collectors and officers can view dashboard" });
    }

    let villages = [];
    
    // COLLECTOR: All villages in district
    if (role === "collector") {
      villages = await Village.find()
        .populate({ path: "block", populate: { path: "district" } })
        .populate("scPopulation", "count");
      
      villages = villages.filter(v => v.block.district._id.toString() === district.toString());
    } 
    // OFFICER: Villages in their block
    else if (role === "officer") {
      villages = await Village.find({ block: block });
    }
    // VILLAGE OFFICER: Only their village
    else if (role === "village") {
      const v = await Village.findById(village);
      if (v) villages = [v];
    }

    const heatmapData = await Promise.all(
      villages.map(async villageDoc => {
        const surveys = await Survey.find({ village: villageDoc._id });
        
        if (surveys.length === 0) {
          return {
            village: villageDoc._id,
            villageName: villageDoc.name,
            color: "gray",
            readiness: 0,
            surveys: 0,
            scPopulation: villageDoc.scPopulation?.count || 0
          };
        }

        const readiness = await calculateVillagePriority(surveys, villageDoc);
        
        // Cache the result
        await VillageReadiness.findOneAndUpdate(
          { village: villageDoc._id },
          readiness,
          { upsert: true, new: true }
        );

        return {
          village: readiness.village,
          villageName: readiness.villageName,
          color: readiness.color,
          readiness: readiness.overallReadiness,
          priority: readiness.priority,
          surveys: readiness.totalSurveys,
          scPopulation: villageDoc.scPopulation?.count || 0,
          geoLocation: villageDoc.location || { lat: 0, lng: 0 }
        };
      })
    );

    // Statistics
    const stats = {
      totalVillages: heatmapData.length,
      red: heatmapData.filter(h => h.color === "red").length,
      yellow: heatmapData.filter(h => h.color === "yellow").length,
      green: heatmapData.filter(h => h.color === "green").length,
      gray: heatmapData.filter(h => h.color === "gray").length,
      avgReadiness: Math.round(
        heatmapData.reduce((sum, h) => sum + h.readiness, 0) / heatmapData.length
      ),
      userRole: role
    };

    res.json({
      success: true,
      stats,
      heatmapData: heatmapData.sort((a, b) => b.readiness - a.readiness),
      role: role
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// VILLAGE DETAILED REPORT (All Roles)
// ========================================
export const getVillageDetailedReport = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { role, district, block } = req.user;

    if (!["collector", "officer", "village"].includes(role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const village = await Village.findById(villageId).populate({
      path: "block",
      populate: { path: "district" }
    });

    if (!village) {
      return res.status(404).json({ message: "Village not found" });
    }

    // Access Control
    if (role === "officer" && village.block._id.toString() !== block.toString()) {
      return res.status(403).json({ message: "Village not in your block" });
    }
    if (role === "village" && village._id.toString() !== req.user.village.toString()) {
      return res.status(403).json({ message: "Not your village" });
    }

    const surveys = await Survey.find({ village: villageId });
    const readiness = await calculateVillagePriority(surveys, village);

    res.json({
      success: true,
      village: {
        _id: village._id,
        name: village.name,
        scPopulation: village.scPopulation?.count || 0,
        totalPopulation: village.totalPopulation || 0,
        block: village.block?.name,
        district: village.block?.district?.name
      },
      readiness,
      totalHousesSurveyed: surveys.length,
      projectPipeline: readiness.recommendedProjects.slice(0, 5),
      domainsAbove70: Object.entries(readiness.domainScores)
        .filter(([_, d]) => d.percentage >= 70)
        .map(([key, data]) => ({ domain: key, percentage: data.percentage })),
      domainsCritical: Object.entries(readiness.domainScores)
        .filter(([_, d]) => d.percentage < 50)
        .map(([key, data]) => ({ domain: key, percentage: data.percentage, gap: data.gap }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// FILTER VILLAGES (Collector/Officer)
// ========================================
export const filterVillagesByPriority = async (req, res) => {
  try {
    const { role, district, block } = req.user;
    const { priorityLevel, minReadiness, maxReadiness } = req.query;

    if (!["collector", "officer"].includes(role)) {
      return res.status(403).json({ message: "Only collectors and officers can filter" });
    }

    let query = {};

    // Role-based filtering
    if (role === "officer") {
      const villages = await Village.find({ block: block });
      query.village = { $in: villages.map(v => v._id) };
    }

    if (priorityLevel) query.priority = priorityLevel;
    if (minReadiness || maxReadiness) {
      query.overallReadiness = {};
      if (minReadiness) query.overallReadiness.$gte = parseInt(minReadiness);
      if (maxReadiness) query.overallReadiness.$lte = parseInt(maxReadiness);
    }

    const readinessList = await VillageReadiness.find(query)
      .populate("village", "name scPopulation totalPopulation location")
      .sort({ priorityScore: -1 })
      .limit(50);

    res.json({
      success: true,
      count: readinessList.length,
      role: role,
      villages: readinessList.map(r => ({
        villageId: r.village._id,
        villageName: r.village.name,
        readiness: r.overallReadiness,
        priority: r.priority,
        color: r.color,
        scPopulation: r.village.scPopulation?.count || 0,
        topGaps: r.topGaps.slice(0, 2),
        recommendedBudget: r.topGaps.reduce((sum, g) => sum + g.suggestedBudget, 0),
        geoLocation: r.village.location
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========================================
// Export Report (Collector Only)
// ========================================
export const exportDistrictReport = async (req, res) => {
  try {
    const { role, district } = req.user;

    if (role !== "collector") {
      return res.status(403).json({ message: "Only collectors can export" });
    }

    const readinessList = await VillageReadiness.find()
      .populate("village", "name scPopulation")
      .sort({ priorityScore: -1 });

    const csvData = readinessList.map(r => ({
      "Village": r.village.name,
      "SC Population": r.village.scPopulation?.count || 0,
      "Readiness %": r.overallReadiness,
      "Priority": r.priority,
      "Color": r.color,
      "Top Gap": r.topGaps[0]?.domain || "N/A",
      "Gap %": r.topGaps[0]?.gapPercentage || 0,
      "Est. Budget": `₹${r.topGaps[0]?.suggestedBudget || 0}`,
      "Recommended Project": r.recommendedProjects[0]?.projectType || "N/A"
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=district-report.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
