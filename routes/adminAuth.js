const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const upload = require("../middleware/upload");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: normalize(email) });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(admin._id);
    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        logo: admin.logo,
        tagline: admin.tagline,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function normalize(email) {
  return String(email || "").toLowerCase().trim();
}

// GET /api/admin/me
router.get("/me", protectAdmin, async (req, res) => {
  res.json({ admin: req.admin });
});

// PUT /api/admin/change-password
router.put("/change-password", protectAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);
    const match = await admin.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ message: "Current password is incorrect" });
    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/settings  (logo, tagline, description, notifications)
router.put(
  "/settings",
  protectAdmin,
  upload.single("logo"),
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.admin._id);
      const { tagline, description, notifyOnNewApplication, notifyOnStatusChange, name } =
        req.body;

      if (req.file) admin.logo = `/uploads/logo/${req.file.filename}`;
      if (tagline !== undefined) admin.tagline = tagline;
      if (description !== undefined) admin.description = description;
      if (name !== undefined) admin.name = name;
      if (notifyOnNewApplication !== undefined)
        admin.notifyOnNewApplication = notifyOnNewApplication === "true";
      if (notifyOnStatusChange !== undefined)
        admin.notifyOnStatusChange = notifyOnStatusChange === "true";

      await admin.save();
      res.json({ admin });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/admin/public-settings (used by candidate panel for branding)
router.get("/public-settings", async (req, res) => {
  const admin = await Admin.findOne().select("logo tagline description name");
  res.json({ admin });
});

module.exports = router;
