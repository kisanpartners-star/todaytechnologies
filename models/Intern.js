const crypto = require("crypto");
const mongoose = require("mongoose");

const internSchema = new mongoose.Schema(
  {
    internId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    degree: { type: String, required: true, trim: true },
    regNumber: { type: String, required: true, trim: true, unique: true },
    domain: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
  },
  { timestamps: true }
);

internSchema.pre("validate", function () {
  if (this.isNew && !this.internId) {
    this.internId = `Tech/26/${crypto.randomInt(100000, 1000000)}`;
  }
});

module.exports = mongoose.model("Intern", internSchema);