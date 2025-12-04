// routes/dashboardRoutes.js - UPDATED
import express from "express";
import { protect, requireDashboardAccess,requireRole } from "../middleware/authMiddleware.js";
import {
  getDistrictHeatmap,
  getVillageDetailedReport,
  filterVillagesByPriority,
  exportDistrictReport
} from "../controllers/dashboardController.js";

const router = express.Router();

// All roles can see heatmap (scoped to their jurisdiction)
router.get("/heatmap", protect, requireDashboardAccess, getDistrictHeatmap);

// All roles can see village details (with access control)
router.get("/village/:villageId", protect, requireDashboardAccess, getVillageDetailedReport);

// Filter (Collector + Officer only)
router.get("/filter", protect, requireRole("collector", "officer"), filterVillagesByPriority);

// Export (Collector only)
router.get("/export", protect, requireRole("collector"), exportDistrictReport);

export default router;
