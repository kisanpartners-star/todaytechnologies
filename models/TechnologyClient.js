const mongoose = require("mongoose");

const technologyClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    demoDate: { type: Date },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Closed"],
      default: "New",
    },
  },
  { timestamps: true }
);

technologyClientSchema.index({ createdAt: -1 });

module.exports = mongoose.model("TechnologyClient", technologyClientSchema);
