const mongoose = require("mongoose");

const internshipApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    collegeName: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    combination: { type: String, required: true, trim: true },
    currentSemester: { type: String, required: true, trim: true },
    passedOutYear: { type: Number, required: true },
    internshipDomain: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: ["Submitted", "Contacted", "Shortlisted", "Rejected"], default: "Submitted" },
  },
  { timestamps: true }
);

internshipApplicationSchema.index({ createdAt: -1 });
internshipApplicationSchema.index({ email: 1 });

module.exports = mongoose.model("InternshipApplication", internshipApplicationSchema);