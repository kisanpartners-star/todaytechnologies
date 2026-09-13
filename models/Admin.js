const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Today Technologies Admin" },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    logo: { type: String, default: "" },
    tagline: { type: String, default: "Connecting Talent with Opportunity" },
    description: { type: String, default: "" },
    notifyOnNewApplication: { type: Boolean, default: true },
    notifyOnStatusChange: { type: Boolean, default: true },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
