const mongoose = require("mongoose");

/**
 * Job fields are organized into logical groups mirroring the admin's
 * multi-tab job-creation form. Each group is its own sub-schema so the
 * form (and this model) can be extended with more fields per tab without
 * touching the rest of the document.
 */
const jobSchema = new mongoose.Schema(
  {
    // ---- Tab 1: Basic Info ----
    basic: {
      title: { type: String, required: true },
      referenceId: { type: String },
      category: { type: String }, // IT / Non-IT
      jobType: { type: String }, // Full-time, Part-time, Contract, Internship
      employmentType: { type: String }, // Permanent, Temporary
      industry: { type: String },
      department: { type: String },
      status: {
        type: String,
        enum: ["draft", "published", "closed"],
        default: "draft",
      },
      vacancies: { type: Number, default: 1 },
      priority: { type: String, enum: ["Low", "Medium", "High", "Urgent"], default: "Medium" },
      postedDate: { type: Date, default: Date.now },
      applicationDeadline: { type: Date },
    },

    // ---- Tab 2: Company / Client Details ----
    company: {
      name: { type: String },
      type: { type: String },
      industry: { type: String },
      website: { type: String },
      contactPerson: { type: String },
      contactEmail: { type: String },
      contactPhone: { type: String },
      location: { type: String },
      recruiterName: { type: String },
      recruiterEmail: { type: String },
      recruiterPhone: { type: String },
    },

    // ---- Tab 3: Job Location ----
    location: {
      workLocationType: { type: String }, // Onsite / Remote / Hybrid
      country: { type: String },
      state: { type: String },
      city: { type: String },
      area: { type: String },
      officeAddress: { type: String },
      travelRequired: { type: Boolean, default: false },
      relocationRequired: { type: Boolean, default: false },
      preferredCandidateLocation: { type: String },
    },

    // ---- Tab 4: Job Description ----
    description: {
      summary: { type: String },
      fullDescription: { type: String },
      keyResponsibilities: { type: String },
      requiredSkills: [{ type: String }],
      preferredSkills: [{ type: String }],
      requiredQualifications: { type: String },
      preferredQualifications: { type: String },
      requiredExperience: { type: String },
      experienceRangeMin: { type: Number },
      experienceRangeMax: { type: Number },
      seniorityLevel: { type: String },
    },

    // ---- Tab 5: Compensation & Benefits ----
    compensation: {
      salaryType: { type: String }, // Fixed / Range / Negotiable
      minSalary: { type: Number },
      maxSalary: { type: Number },
      currency: { type: String, default: "INR" },
      salaryPeriod: { type: String, default: "Annual" },
      negotiable: { type: Boolean, default: false },
      bonus: { type: String },
      joiningBonus: { type: String },
      benefits: [{ type: String }],
      otherCompensationDetails: { type: String },
    },

    // ---- Tab 6: Candidate Requirements ----
    requirements: {
      genderPreference: { type: String, default: "Any" },
      educationLevel: { type: String },
      degree: { type: String },
      specialization: { type: String },
      noticePeriod: { type: String },
      immediateJoiner: { type: Boolean, default: false },
      visaRequired: { type: Boolean, default: false },
      languageRequirements: [{ type: String }],
      drivingLicenseRequired: { type: Boolean, default: false },
      eligibilityCriteria: { type: String },
    },

    // ---- Tab 7: IT-specific ----
    itDetails: {
      jobRole: { type: String },
      primaryTechnologies: [{ type: String }],
      secondaryTechnologies: [{ type: String }],
      programmingLanguages: [{ type: String }],
      frameworks: [{ type: String }],
      databaseTech: [{ type: String }],
      cloudPlatform: { type: String },
      devopsTools: [{ type: String }],
      technicalCertifications: [{ type: String }],
    },

    // ---- Tab 8: Non-IT specific ----
    nonItDetails: {
      functionArea: { type: String },
      businessFunction: { type: String },
      salesTarget: { type: String },
      shiftRequirement: { type: String },
      softSkills: [{ type: String }],
      certificationRequired: { type: String },
      managementExperience: { type: String },
    },

    // ---- Tab 9: Interview & Recruitment Process ----
    interviewProcess: {
      interviewRounds: { type: Number, default: 1 },
      interviewMode: { type: String }, // Online / Offline / Telephonic
      interviewerName: { type: String },
      assessmentRequired: { type: Boolean, default: false },
      technicalAssessment: { type: Boolean, default: false },
      backgroundVerification: { type: Boolean, default: false },
      referenceCheck: { type: Boolean, default: false },
      selectionProcess: { type: String },
    },

    // ---- Tab 10: Application Settings ----
    applicationSettings: {
      applyThroughPortal: { type: Boolean, default: true },
      externalApplicationUrl: { type: String },
      applicationEmail: { type: String },
      resumeRequired: { type: Boolean, default: true },
      maxFileSizeMB: { type: Number, default: 5 },
      screeningQuestions: [{ type: String }],
      recruiterNotes: { type: String },
    },

    // ---- Tab 11: Compliance & Visibility ----
    visibility: {
      jobVisibility: { type: String, enum: ["public", "internal"], default: "public" },
      featuredJob: { type: Boolean, default: false },
      confidentialJob: { type: Boolean, default: false },
      equalOpportunityStatement: { type: String },
      dataPrivacyConsent: { type: Boolean, default: true },
      approvedBy: { type: String },
    },

    // ---- Media ----
    images: [{ type: String }], // paths under /uploads

    // ---- Derived / meta ----
    tag: {
      type: String,
      enum: ["Fast-moving", "MNC", "Startup", "Mid-level", "Fresher-level", "Experienced-level", ""],
      default: "",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

jobSchema.index({ "basic.title": "text", "description.fullDescription": "text" });

module.exports = mongoose.model("Job", jobSchema);
