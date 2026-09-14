const express = require("express");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const upload = require("../middleware/upload");
const { protectAdmin, protectCandidate } = require("../middleware/auth");
const { computeMatchScore } = require("../utils/matchScore");
const { isProfileComplete } = require("../utils/profileCompletion");

const router = express.Router();

// ---------- CANDIDATE ----------

// POST /api/applications/:jobId  -> apply to a job (quick-apply aware)
router.post("/:jobId", protectCandidate, upload.single("resume"), async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user._id);
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!isProfileComplete(candidate)) {
      return res.status(403).json({
        message: "Please complete your profile to 100% before applying.",
        requiresProfile: true,
      });
    }

    // Quick-apply data: use body if provided, else fall back to existing profile
    const { name, phone, email, qualification, experienceStatus } = req.body;

    if (name) candidate.name = name;
    if (phone) candidate.phone = phone;
    if (email) candidate.email = email;
    if (qualification) candidate.qualification = qualification;
    if (experienceStatus) candidate.experienceStatus = experienceStatus;

    if (req.file) {
      candidate.documents = candidate.documents || {};
      candidate.documents.resume = `/uploads/resume/${req.file.filename}`;
    }
    await candidate.save();

    const existing = await Application.findOne({ job: job._id, candidate: candidate._id });
    if (existing) {
      return res.status(400).json({ message: "You have already applied to this job" });
    }

    const matchScore = computeMatchScore(candidate, job);

    const application = await Application.create({
      job: job._id,
      candidate: candidate._id,
      snapshot: {
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        qualification: candidate.qualification,
        experienceStatus: candidate.experienceStatus,
      },
      matchScore,
      resumeUsed: candidate.documents?.resume,
      timeline: [{ status: "Applied", note: "Application submitted" }],
    });

    res.status(201).json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/applications/my  -> candidate's applications (My Jobs / Track Applications)
router.get("/my", protectCandidate, async (req, res) => {
  try {
    const { page = 1, limit = 10, jobId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = { candidate: req.user._id };
    if (jobId) query.job = jobId;
    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate("job")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments({ candidate: req.user._id }),
    ]);
    res.json({ applications, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- ADMIN ----------

// GET /api/applications/job/:jobId -> all applications for a job, paginated + AI ranked
router.get("/job/:jobId", protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, minExperience, skills, qualification, location } =
      req.query;

    const query = { job: req.params.jobId };
    if (status) query.status = status;

    let applications = await Application.find(query)
      .populate("candidate")
      .sort({ matchScore: -1 });

    // In-memory filters against populated candidate (small dataset assumption;
    // for large scale this would move into an aggregation pipeline)
    if (minExperience) {
      applications = applications.filter(
        (a) => (a.candidate?.yearsOfExperience || 0) >= Number(minExperience)
      );
    }
    if (qualification) {
      applications = applications.filter((a) =>
        (a.candidate?.qualification || "").toLowerCase().includes(qualification.toLowerCase())
      );
    }
    if (location) {
      applications = applications.filter((a) =>
        (a.candidate?.contact?.city || "").toLowerCase().includes(location.toLowerCase())
      );
    }
    if (skills) {
      const skillList = skills.split(",").map((s) => s.trim().toLowerCase());
      applications = applications.filter((a) => {
        const candSkills = [
          ...(a.candidate?.itSkills?.primarySkills || []),
          ...(a.candidate?.itSkills?.secondarySkills || []),
          ...(a.candidate?.nonItSkills?.functionalSkills || []),
        ].map((s) => s.toLowerCase());
        return skillList.some((s) => candSkills.includes(s));
      });
    }

    const topMatches = applications.filter((a) => a.matchScore >= 70).slice(0, 5);

    const total = applications.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = applications.slice(start, start + Number(limit));

    res.json({
      topMatches,
      applications: paginated,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/applications/:id -> full candidate application detail (A-Z profile)
router.get("/:id", protectAdmin, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("candidate")
      .populate("job");
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/applications/:id/status -> Shortlist / Reject / Hold / Joined etc.
router.patch("/:id/status", protectAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    application.status = status;
    application.timeline.push({ status, note });
    await application.save();

    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/applications/:id/interview -> schedule interview
router.patch("/:id/interview", protectAdmin, async (req, res) => {
  try {
    const { scheduledDate, mode, notes } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    application.interview = { scheduledDate, mode, notes };
    application.status = "Interview Scheduled";
    application.timeline.push({ status: "Interview Scheduled", note: notes });
    await application.save();

    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/applications/:id/notes -> add internal note
router.post("/:id/notes", protectAdmin, async (req, res) => {
  try {
    const { note } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });
    application.internalNotes.push({ note });
    await application.save();
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/applications/status/tracker -> all Shortlisted / Hold / Interview Scheduled
router.get("/status/tracker", protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = { status: { $in: ["Shortlisted", "Hold", "Interview Scheduled"] } };
    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate("candidate")
        .populate("job")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(query),
    ]);
    res.json({ applications, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/applications/status/success -> Joined candidates (placement records)
router.get("/status/success", protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = { status: "Joined" };
    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate("candidate")
        .populate("job")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(query),
    ]);
    res.json({ applications, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
