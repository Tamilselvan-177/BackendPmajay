import express from "express";
import { getStates, getDistrictsByState, getBlocksByDistrict, getVillagesByBlock } from "../controllers/locationController.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/districts/:stateId", getDistrictsByState);
router.get("/blocks/:districtId", getBlocksByDistrict);
router.get("/villages/:blockId", getVillagesByBlock);

export default router;
