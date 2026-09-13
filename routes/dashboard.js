const express = require("express");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", protectAdmin, async (req, res) => {
  try {
    const [
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      featuredJobs,
      totalApplications,
      totalCandidates,
      shortlisted,
      onHold,
      interviewsScheduled,
      rejected,
      joined,
      appliedToday,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ "basic.status": "published" }),
      Job.countDocuments({ "basic.status": "draft" }),
      Job.countDocuments({ "basic.status": "closed" }),
      Job.countDocuments({ "visibility.featuredJob": true }),
      Application.countDocuments(),
      Candidate.countDocuments(),
      Application.countDocuments({ status: "Shortlisted" }),
      Application.countDocuments({ status: "Hold" }),
      Application.countDocuments({ status: "Interview Scheduled" }),
      Application.countDocuments({ status: "Rejected" }),
      Application.countDocuments({ status: "Joined" }),
      Application.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    const itJobs = await Job.countDocuments({ "basic.category": "IT" });
    const nonItJobs = await Job.countDocuments({ "basic.category": "Non-IT" });
    const avgVacancies = await Job.aggregate([
      { $group: { _id: null, avg: { $avg: "$basic.vacancies" } } },
    ]);

    const cards = [
      { label: "Total Jobs", value: totalJobs },
      { label: "Active Jobs", value: activeJobs },
      { label: "Draft Jobs", value: draftJobs },
      { label: "Closed Jobs", value: closedJobs },
      { label: "Featured Jobs", value: featuredJobs },
      { label: "IT Jobs", value: itJobs },
      { label: "Non-IT Jobs", value: nonItJobs },
      { label: "Total Applications", value: totalApplications },
      { label: "Applications Today", value: appliedToday },
      { label: "Total Candidates", value: totalCandidates },
      { label: "Shortlisted", value: shortlisted },
      { label: "On Hold", value: onHold },
      { label: "Interviews Scheduled", value: interviewsScheduled },
      { label: "Rejected", value: rejected },
      { label: "Joined / Placed", value: joined },
      {
        label: "Avg. Vacancies / Job",
        value: Math.round((avgVacancies[0]?.avg || 0) * 10) / 10,
      },
      {
        label: "Conversion Rate",
        value: totalApplications
          ? `${Math.round((joined / totalApplications) * 100)}%`
          : "0%",
      },
      {
        label: "Shortlist Rate",
        value: totalApplications
          ? `${Math.round((shortlisted / totalApplications) * 100)}%`
          : "0%",
      },
      { label: "Open Positions", value: activeJobs },
      { label: "Applications / Job (avg)", value: totalJobs ? Math.round(totalApplications / totalJobs) : 0 },
    ];

    // Line chart: applications over last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    const dailyApps = await Application.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Bar chart: jobs by category
    const jobsByCategory = await Job.aggregate([
      { $group: { _id: "$basic.category", count: { $sum: 1 } } },
    ]);

    // Pie chart: application status distribution
    const statusDistribution = await Application.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      cards,
      charts: {
        applicationsOverTime: dailyApps,
        jobsByCategory,
        statusDistribution,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dashboard/notifications -> recent activity feed
router.get("/notifications", protectAdmin, async (req, res) => {
  try {
    const recentApplications = await Application.find()
      .populate("candidate", "name")
      .populate("job", "basic.title")
      .sort({ createdAt: -1 })
      .limit(10);

    const notifications = recentApplications.map((a) => ({
      id: a._id,
      message: `${a.candidate?.name || "A candidate"} applied for ${
        a.job?.basic?.title || "a job"
      }`,
      status: a.status,
      time: a.createdAt,
    }));

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
