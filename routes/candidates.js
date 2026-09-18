const express = require("express");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const upload = require("../middleware/upload");
const { protectCandidate, protectAdmin } = require("../middleware/auth");
const { isProfileComplete } = require("../utils/profileCompletion");

const router = express.Router();

// POST /api/candidates/public-profile -> collect a profile without candidate login
router.post("/public-profile", upload.single("resume"), async (req, res) => {
  try {
    const profile = typeof req.body.profile === "string" ? JSON.parse(req.body.profile) : req.body.profile || {};
    if (!req.file) return res.status(400).json({ message: "Resume is required." });
    if (!profile.email) return res.status(400).json({ message: "Email ID is required." });
    const existing = await Candidate.findOne({ email: String(profile.email).toLowerCase() });
    if (existing) return res.status(409).json({ message: "A profile already exists for this email address." });

    profile.documents = {
      ...(profile.documents || {}),
      resume: `/uploads/resume/${req.file.filename}`,
    };
    const candidate = new Candidate({ ...profile, email: String(profile.email).toLowerCase() });
    candidate.qualification = candidate.profileFields?.education?.highestQual || "";
    candidate.profileComplete = isProfileComplete(candidate);
    await candidate.save();
    res.status(201).json({ candidate });
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not submit profile." });
  }
});

// GET /api/candidates/profile
router.get("/profile", protectCandidate, async (req, res) => {
  const candidate = await Candidate.findById(req.user._id);
  const complete = isProfileComplete(candidate);
  if (candidate.profileComplete !== complete) {
    candidate.profileComplete = complete;
    await candidate.save();
  }
  res.json({ candidate });
});

// PUT /api/candidates/profile -> update any tab(s) of the profile
router.put("/profile", protectCandidate, async (req, res) => {
  try {
    const allowedTopLevel = [
      "name",
      "phone",
      "qualification",
      "experienceStatus",
      "yearsOfExperience",
      "personal",
      "contact",
      "career",
      "preferences",
      "education",
      "itSkills",
      "nonItSkills",
      "employmentHistory",
      "projects",
      "immigration",
      "languages",
      "references",
      "profileFields",
    ];
    const update = {};
    allowedTopLevel.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    if (req.body.profileFields?.education?.highestQual) {
      update.qualification = req.body.profileFields.education.highestQual;
    }

    const candidate = await Candidate.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    candidate.profileComplete = isProfileComplete(candidate);
    await candidate.save();

    res.json({ candidate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/candidates/documents -> upload resume / cover letter / id proof
router.post(
  "/documents",
  protectCandidate,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "coverLetter", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const candidate = await Candidate.findById(req.user._id);
      candidate.documents = candidate.documents || {};
      if (req.files?.resume?.[0])
        candidate.documents.resume = `/uploads/resume/${req.files.resume[0].filename}`;
      if (req.files?.coverLetter?.[0])
        candidate.documents.coverLetter = `/uploads/coverLetter/${req.files.coverLetter[0].filename}`;
      if (req.files?.idProof?.[0])
        candidate.documents.idProof = `/uploads/idProof/${req.files.idProof[0].filename}`;
      candidate.profileComplete = isProfileComplete(candidate);
      await candidate.save();
      res.json({ candidate });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// POST /api/candidates/save-job/:jobId -> bookmark a job
router.post("/save-job/:jobId", protectCandidate, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user._id);
    if (!candidate.savedJobs.includes(req.params.jobId)) {
      candidate.savedJobs.push(req.params.jobId);
      await candidate.save();
    }
    res.json({ savedJobs: candidate.savedJobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/candidates/save-job/:jobId -> remove bookmark
router.delete("/save-job/:jobId", protectCandidate, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user._id);
    candidate.savedJobs = candidate.savedJobs.filter(
      (id) => id.toString() !== req.params.jobId
    );
    await candidate.save();
    res.json({ savedJobs: candidate.savedJobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/candidates/saved-jobs
router.get("/saved-jobs", protectCandidate, async (req, res) => {
  const candidate = await Candidate.findById(req.user._id).populate("savedJobs");
  res.json({ savedJobs: candidate.savedJobs });
});

// ---------- ADMIN: browse candidates ----------
// GET /api/candidates/admin/all -> paginated candidate directory
router.get("/admin/all", protectAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      name,
      qualification,
      experience,
      minSalary,
      maxSalary,
      dob,
      phone,
      experienceType,
      location,
    } = req.query;
    const query = {};
    if (name) query.name = new RegExp(name, "i");
    if (qualification) query.qualification = new RegExp(qualification, "i");
    if (phone) query.phone = new RegExp(phone, "i");
    if (experience) query.yearsOfExperience = { $gte: Number(experience) };
    const candidates = await Candidate.find(query).sort({ createdAt: -1 });
    const filtered = candidates.filter((candidate) => {
      if (!isProfileComplete(candidate)) return false;
      const fields = candidate.profileFields || {};
      const employment = fields.employment || {};
      const locationFields = fields.location || {};
      const companies = employment.companies || [];
      const salaries = companies.flatMap((company) => [company.currentPackage, company.expectedSalary])
        .concat([candidate.career?.currentSalary, candidate.career?.expectedSalary])
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map(Number);
      const salaryMatches = (!minSalary || salaries.some((salary) => salary >= Number(minSalary))) &&
        (!maxSalary || salaries.some((salary) => salary <= Number(maxSalary)));
      const dobMatches = !dob || String(fields.personal?.dob || "").startsWith(String(dob));
      const typeMatches = !experienceType || employment.experienceType === experienceType;
      const locationMatches = !location || [locationFields.currentCity, locationFields.otherCity, locationFields.currentArea, locationFields.preferredLocation, candidate.contact?.city]
        .some((value) => String(value || "").toLowerCase().includes(String(location).toLowerCase()));
      return salaryMatches && dobMatches && typeMatches && locationMatches;
    });
    const start = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(start, start + Number(limit));
    res.json({ candidates: paginated, total: filtered.length, page: Number(page), pages: Math.ceil(filtered.length / Number(limit)) || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/candidates/admin/:id -> full completed candidate profile
router.get("/admin/:id", protectAdmin, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    if (!isProfileComplete(candidate)) return res.status(404).json({ message: "Candidate profile is incomplete" });
    res.json({ candidate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
