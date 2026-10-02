const express = require("express");
const { protectCandidate } = require("../middleware/auth");
const Intern = require("../models/Intern");
const InternClass = require("../models/InternClass");
const { sendMail } = require("../utils/mail");

const router = express.Router();

router.use(protectCandidate);

router.get("/classes/:internId", async (req, res) => {
  const intern = await Intern.findOne({ internId: req.params.internId.trim() });
  if (!intern) return res.status(404).json({ message: "Intern ID not found. Check the ID issued by Today Technologies and try again." });
  if (intern.status !== "active") return res.status(403).json({ message: "Access for this Intern ID is currently disabled. Please contact Today Technologies." });
  const classes = await InternClass.find({ assignedInterns: intern._id, status: "published" }).sort({ createdAt: -1 });
  res.json({ intern: { internId: intern.internId, name: intern.name }, classes });
});

router.post("/queries", async (req, res) => {
  const { name, email, phone, description, internId } = req.body;
  if (![name, email, phone, description].every((value) => String(value || "").trim())) return res.status(400).json({ message: "Complete all query fields before submitting." });
  const safe = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  try {
    await sendMail({ to: "info@todaytechnologies.co.in", subject: `Online internship class query from ${safe(name)}`, html: `<div style="font-family:Arial,sans-serif"><h2>Online class query</h2><p><strong>Name:</strong> ${safe(name)}</p><p><strong>Email:</strong> ${safe(email)}</p><p><strong>Phone:</strong> ${safe(phone)}</p><p><strong>Intern ID:</strong> ${safe(internId || "Not entered")}</p><p><strong>Message:</strong><br>${safe(description).replace(/\n/g, "<br>")}</p><p>Submitted by signed-in account: ${safe(req.user.email)}</p></div>` });
    res.json({ message: "Your query has been sent." });
  } catch (error) { res.status(error.status || 500).json({ message: error.message || "Unable to send your query." }); }
});

module.exports = router;