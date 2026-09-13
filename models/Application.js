const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },

    // Snapshot of quick-apply data at time of application
    snapshot: {
      name: String,
      phone: String,
      email: String,
      qualification: String,
      experienceStatus: String,
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "Shortlisted",
        "Hold",
        "Interview Scheduled",
        "Rejected",
        "Joined",
      ],
      default: "Applied",
    },

    matchScore: { type: Number, default: 0 }, // 0-100 AI match score

    interview: {
      scheduledDate: { type: Date },
      mode: { type: String },
      notes: { type: String },
    },

    internalNotes: [
      {
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    timeline: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],

    resumeUsed: { type: String }, // path to resume snapshot for this application
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
