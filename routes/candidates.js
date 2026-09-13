const express = require("express");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const upload = require("../middleware/upload");
const { protectCandidate, protectAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/candidates/profile
router.get("/profile", protectCandidate, async (req, res) => {
  const candidate = await Candidate.findById(req.user._id);
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
    ];
    const update = {};
    allowedTopLevel.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const candidate = await Candidate.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    const hasRequired = candidate.phone && candidate.email && candidate.qualification;
    if (hasRequired && !candidate.profileComplete) {
      candidate.profileComplete = true;
      await candidate.save();
    }

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
      if (req.files.resume)
        candidate.documents.resume = `/uploads/resume/${req.files.resume[0].filename}`;
      if (req.files.coverLetter)
        candidate.documents.coverLetter = `/uploads/coverLetter/${req.files.coverLetter[0].filename}`;
      if (req.files.idProof)
        candidate.documents.idProof = `/uploads/idProof/${req.files.idProof[0].filename}`;
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
    const { page = 1, limit = 10, search } = req.query;
    const query = {};
    if (search) query.name = new RegExp(search, "i");
    const skip = (Number(page) - 1) * Number(limit);
    const [candidates, total] = await Promise.all([
      Candidate.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Candidate.countDocuments(query),
    ]);
    res.json({ candidates, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
