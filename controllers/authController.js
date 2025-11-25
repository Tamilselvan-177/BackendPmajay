import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Village from '../models/Village.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ============================
// REGISTER CONTROLLER
// ============================
export const register = async (req, res) => {
  try {
    let { username, password, role, fullName, email, phone, state, district, block, villageId, assignedCollector } = req.body;

    if (!username || !password || !fullName || !email) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ message: "Username or Email already exists" });
    }

    if (!role) role = "officer";

    // PRIME MINISTER
    if (role === "primeminister") {
      state = null;
      district = null;
      block = null;
      villageId = null;
      assignedCollector = null;
    }

    // COLLECTOR
    if (role === "collector") {
      if (!state || !district) {
        return res.status(400).json({ message: "Collectors require state & district" });
      }
      block = null;
      villageId = null;
      assignedCollector = null;
    }

    // OFFICER
    if (role === "officer") {
      if (!state || !district || !block || !villageId) {
        return res.status(400).json({ message: "Officers must have state, district, block & villageId" });
      }

      const village = await Village.findById(villageId);
      if (!village) return res.status(404).json({ message: "Village not found" });

      if (!assignedCollector) {
        return res.status(400).json({ message: "Assigned Collector is required for Officers" });
      }
    }

    // Create user
    const user = await User.create({
      username,
      password,
      role,
      fullName,
      email,
      phone,
      state,
      district,
      block,
      village: villageId,
      assignedCollector
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        username,
        fullName,
        role,
        village: user.village,
      },
      token: generateToken(user._id)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ============================
// LOGIN CONTROLLER (UPDATED)
// ============================
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username & Password required" });
    }

    const user = await User.findOne({ username }).populate("village", "name block district state");

    if (user && (await user.matchPassword(password))) {
      return res.json({
        success: true,
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        state: user.state,
        district: user.district,
        block: user.block,
        village: user.village,           // returns full village object
        assignedCollector: user.assignedCollector,
        token: generateToken(user._id),
      });
    }

    return res.status(401).json({ message: "Invalid credentials" });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ============================
// GET COLLECTORS
// ============================
export const getCollectors = async (req, res) => {
  try {
    const collectors = await User.find({ role: "collector" })
      .select("_id fullName district state");
    res.json({ success: true, collectors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
// PROFILE
// ============================
export const getUserProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};
