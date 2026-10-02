const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({ url: String, name: String }, { _id: false });
const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: String,
  description: String,
  videos: [resourceSchema],
  documents: [resourceSchema],
  images: [resourceSchema],
  links: [String],
  note: String,
});

const internClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    duration: String,
    subject: String,
    assignedInterns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Intern" }],
    modules: [moduleSchema],
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InternClass", internClassSchema);