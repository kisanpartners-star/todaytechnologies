const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) return res.status(401).json({ message: "Admin not found" });
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

// For candidate-protected routes we accept either a passport session
// (Google OAuth) or a JWT issued after login, for flexibility with SPA flows.
const protectCandidate = async (req, res, next) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const Candidate = require("../models/Candidate");
      const candidate = await Candidate.findById(decoded.id);
      if (!candidate) return res.status(401).json({ message: "Candidate not found" });
      req.user = candidate;
      return next();
    }
    return res.status(401).json({ message: "Please log in with Google to continue" });
  } catch (err) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = { protectAdmin, protectCandidate };
