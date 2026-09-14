const express = require("express");
const TechnologyClient = require("../models/TechnologyClient");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

// Public contact form submission.
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, service, description, demoDate } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !service?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Please complete all required fields" });
    }

    const client = await TechnologyClient.create({
      name,
      email,
      phone,
      service,
      description,
      demoDate: demoDate || undefined,
    });

    res.status(201).json({ client });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin list of Technologies contact form submissions.
router.get("/", protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = status ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [clients, total] = await Promise.all([
      TechnologyClient.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      TechnologyClient.countDocuments(query),
    ]);

    res.json({
      clients,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/status", protectAdmin, async (req, res) => {
  try {
    const client = await TechnologyClient.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Technology client not found" });

    client.status = req.body.status;
    await client.save();
    res.json({ client });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
