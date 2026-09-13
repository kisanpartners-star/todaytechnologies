require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = (process.env.ADMIN_EMAIL || "todaytechadmin@gmail.com").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "123456";

    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
    } else {
      await Admin.create({
        name: "Today Technologies Admin",
        email,
        password,
        tagline: "Connecting Talent with Opportunity",
      });
      console.log(`Admin created: ${email} / ${password}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
})();
