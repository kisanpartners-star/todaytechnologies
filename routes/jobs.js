const express = require("express");
const Job = require("../models/Job");
const upload = require("../middleware/upload");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

// ---------- PUBLIC (candidate-facing) ----------

// GET /api/jobs  -> published jobs, paginated, filterable
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      tag,
      location,
      jobType,
    } = req.query;

    const query = { "basic.status": "published", "visibility.jobVisibility": "public" };
    if (search) query.$text = { $search: search };
    if (category) query["basic.category"] = category;
    if (tag) query.tag = tag;
    if (jobType) query["basic.jobType"] = jobType;
    if (location) query["location.city"] = new RegExp(location, "i");

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Job.countDocuments(query),
    ]);

    res.json({
      jobs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- ADMIN ----------

// GET /api/jobs/admin/all -> all jobs incl. drafts, paginated
router.get("/admin/all", protectAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};
    if (status) query["basic.status"] = status;
    if (search) query["basic.title"] = new RegExp(search, "i");

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Job.countDocuments(query),
    ]);

    res.json({ jobs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/jobs/:id -> single job detail (public if published)
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/jobs -> create job (draft or published based on basic.status)
router.post("/", protectAdmin, upload.array("images", 3), async (req, res) => {
  try {
    const payload = JSON.parse(req.body.data || "{}");
    if (req.files?.length) {
      payload.images = req.files.map((f) => `/uploads/images/${f.filename}`);
    }
    payload.createdBy = req.admin._id;
    const job = await Job.create(payload);
    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/jobs/:id -> update job
router.put("/:id", protectAdmin, upload.array("images", 3), async (req, res) => {
  try {
    const payload = JSON.parse(req.body.data || "{}");
    if (req.files?.length) {
      const newImages = req.files.map((f) => `/uploads/images/${f.filename}`);
      payload.images = [...(payload.images || []), ...newImages];
    }
    const job = await Job.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/jobs/:id/status -> toggle draft/published/closed
router.patch("/:id/status", protectAdmin, async (req, res) => {
  try {
    const { status } = req.body; // draft | published | closed
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { "basic.status": status },
      { new: true }
    );
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
