const express = require("express");
const InternshipApplication = require("../models/InternshipApplication");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const required = [
      "name", "phone", "email", "collegeName", "degree", "combination",
      "currentSemester", "passedOutYear", "internshipDomain", "duration", "joiningDate",
    ];
    const missing = required.find((field) => !String(req.body[field] || "").trim());
    if (missing) return res.status(400).json({ message: `${missing} is required` });

    const application = await InternshipApplication.create({
      ...req.body,
      passedOutYear: Number(req.body.passedOutYear),
      joiningDate: new Date(req.body.joiningDate),
    });
    res.status(201).json({ application });
  } catch (err) {
    res.status(400).json({ message: err.message || "Unable to submit application" });
  }
});

router.get("/", protectAdmin, async (req, res) => {
  try {
    const { search = "", domain = "", duration = "", year = "" } = req.query;
    const query = {};
    if (search) {
      const expression = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: expression }, { email: expression }, { phone: expression }, { collegeName: expression }];
    }
    if (domain) query.internshipDomain = domain;
    if (duration) query.duration = duration;
    if (year) query.passedOutYear = Number(year);
    const applications = await InternshipApplication.find(query).sort({ createdAt: -1 });
    res.json({ applications, total: applications.length });
  } catch (err) {
    res.status(500).json({ message: err.message || "Unable to load applications" });
  }
});

module.exports = router;