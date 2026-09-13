const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    googleId: { type: String },
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    profilePhoto: { type: String },

    // Quick-apply required fields
    phone: { type: String },
    qualification: { type: String },
    experienceStatus: { type: String, enum: ["Fresher", "Experienced", ""], default: "" },
    yearsOfExperience: { type: Number, default: 0 },
    profileComplete: { type: Boolean, default: false },

    // ---- Tab 1: Personal Information ----
    personal: {
      dob: { type: Date },
      gender: { type: String },
      maritalStatus: { type: String },
      nationality: { type: String },
    },

    // ---- Tab 2: Contact Information ----
    contact: {
      alternatePhone: { type: String },
      currentAddress: { type: String },
      permanentAddress: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      pinCode: { type: String },
    },

    // ---- Tab 3: Career Information ----
    career: {
      currentDesignation: { type: String },
      currentCompany: { type: String },
      currentSalary: { type: Number },
      expectedSalary: { type: Number },
      noticePeriod: { type: String },
      totalExperienceYears: { type: Number },
    },

    // ---- Tab 4: Job Preferences ----
    preferences: {
      preferredJobType: { type: String },
      preferredLocations: [{ type: String }],
      preferredIndustry: { type: String },
      willingToRelocate: { type: Boolean, default: false },
    },

    // ---- Tab 5: Education ----
    education: [
      {
        degree: String,
        specialization: String,
        institution: String,
        passingYear: Number,
        percentageOrCgpa: String,
      },
    ],

    // ---- Tab 6: IT / Technical Skills ----
    itSkills: {
      primarySkills: [{ type: String }],
      secondarySkills: [{ type: String }],
      programmingLanguages: [{ type: String }],
      frameworks: [{ type: String }],
      tools: [{ type: String }],
    },

    // ---- Tab 7: Non-IT / Functional Skills ----
    nonItSkills: {
      functionalSkills: [{ type: String }],
      softSkills: [{ type: String }],
    },

    // ---- Tab 8: Employment History ----
    employmentHistory: [
      {
        company: String,
        designation: String,
        startDate: Date,
        endDate: Date,
        currentlyWorking: Boolean,
        responsibilities: String,
      },
    ],

    // ---- Tab 9: Projects ----
    projects: [
      {
        title: String,
        description: String,
        techStack: [String],
        duration: String,
      },
    ],

    // ---- Tab 10: Resume & Documents ----
    documents: {
      resume: { type: String },
      coverLetter: { type: String },
      idProof: { type: String },
      otherDocuments: [{ type: String }],
    },

    // ---- Tab 13: International / Immigration ----
    immigration: {
      visaStatus: { type: String },
      workAuthorization: { type: String },
      passportNumber: { type: String },
    },

    // ---- Tab 14: Languages ----
    languages: [
      {
        language: String,
        proficiency: String, // Basic / Intermediate / Fluent / Native
      },
    ],

    // ---- Tab 15: References ----
    references: [
      {
        name: String,
        relationship: String,
        contact: String,
      },
    ],

    // ---- Tab 16: Consultancy / Recruitment tracking ----
    consultancy: {
      sourcedBy: { type: String },
      assignedRecruiter: { type: String },
      internalNotes: { type: String },
    },

    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);
