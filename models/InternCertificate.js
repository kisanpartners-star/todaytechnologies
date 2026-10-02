const crypto = require("crypto");
const mongoose = require("mongoose");

const internCertificateSchema = new mongoose.Schema(
  {
    certificateNumber: { type: String, unique: true, index: true },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: "Intern", required: true, unique: true },
    emailedAt: Date,
  },
  { timestamps: true }
);

internCertificateSchema.pre("validate", function () {
  if (this.isNew && !this.certificateNumber) {
    this.certificateNumber = `TT-CERT-26-${crypto.randomInt(100000, 1000000)}`;
  }
});

module.exports = mongoose.model("InternCertificate", internCertificateSchema);