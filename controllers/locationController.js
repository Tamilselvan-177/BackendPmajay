import State from "../models/State.js";
import District from "../models/District.js";
import Village from "../models/Village.js";
import Block from "../models/block.js";
// fetch all states
export const getStates = async (req, res) => {
  const states = await State.find();
  res.json({ success: true, states });
};

// fetch districts by state
export const getDistrictsByState = async (req, res) => {
  const districts = await District.find({ state: req.params.stateId });
  res.json({ success: true, districts });
};

// fetch blocks by district
export const getBlocksByDistrict = async (req, res) => {
  const blocks = await Block.find({ district: req.params.districtId });
  res.json({ success: true, blocks });
};

// fetch villages by block
export const getVillagesByBlock = async (req, res) => {
  const villages = await Village.find({ block: req.params.blockId });
  res.json({ success: true, villages });
};
