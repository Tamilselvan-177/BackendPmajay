import jwt from "jsonwebtoken";
import User from "../models/User.js";

// -------------------------------------------
// Middleware: Protect Routes (JWT Verification)
// -------------------------------------------
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      return next();
    } catch (error) {
      console.error("JWT Error:", error.message);
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token provided" });
};

// -------------------------------------------
// Middleware: Role-Based Access Control
// -------------------------------------------
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Allowed roles: ${roles.join(", ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

export const requireDashboardAccess = (req, res, next) => {
  if (!["collector", "officer", "village"].includes(req.user.role)) {
    return res.status(403).json({ 
      message: "Only collectors, officers, and village officers can access dashboard" 
    });
  }
  next();
};