import express from "express";
import Village from "../models/Village.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add village
router.post("/", protect, async (req, res) => {
  try {
    const village = await Village.create(req.body);
    res.json({ success: true, village });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get villages by district
router.get("/:district", protect, async (req, res) => {
  try {
    const villages = await Village.find({ district: req.params.district });
    res.json({ success: true, villages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
