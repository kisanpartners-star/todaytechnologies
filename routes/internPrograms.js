const express = require("express");
const { protectAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const Intern = require("../models/Intern");
const InternClass = require("../models/InternClass");
const InternCertificate = require("../models/InternCertificate");
const { sendMail } = require("../utils/mail");

const router = express.Router();

function parseJson(value, fallback) {
  if (typeof value !== "string") return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function addModuleUploads(modules, files = {}) {
  return modules.map((module, index) => {
    const next = { ...module };
    for (const [kind, field] of [["videos", "video"], ["documents", "document"], ["images", "image"]]) {
      const name = `module_${index}_${field}`;
      const additions = (files[name] || []).map((file) => ({ url: `/uploads/${name}/${file.filename}`, name: file.originalname }));
      next[kind] = [...(Array.isArray(next[kind]) ? next[kind] : []), ...additions].slice(0, 3);
    }
    next.links = (Array.isArray(next.links) ? next.links : []).filter(Boolean).slice(0, 3);
    return next;
  });
}

function classUploadFields() {
  return Array.from({ length: 50 }, (_, module) => ["video", "document", "image"].map((kind) => ({ name: `module_${module}_${kind}`, maxCount: 3 }))).flat();
}

function validInternInput(body) {
  return ["name", "collegeName", "email", "degree", "regNumber", "domain", "duration", "gender"]
    .every((key) => String(body[key] || "").trim());
}

router.get("/verify/:certificateNumber", async (req, res) => {
  try {
    const certificate = await InternCertificate.findOne({ certificateNumber: req.params.certificateNumber }).populate("intern");
    if (!certificate || !certificate.intern) return res.status(404).json({ message: "Certificate not found" });
    const { name, internId, regNumber, email, collegeName, degree, domain, duration } = certificate.intern;
    res.json({ certificateNumber: certificate.certificateNumber, issuedAt: certificate.createdAt, intern: { name, internId, regNumber, email, collegeName, degree, domain, duration } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.use(protectAdmin);

router.get("/interns", async (req, res) => {
  const interns = await Intern.find().sort({ createdAt: -1 });
  res.json({ interns });
});

router.post("/interns", async (req, res) => {
  if (!validInternInput(req.body)) return res.status(400).json({ message: "Complete all intern details before saving." });
  try {
    const intern = await Intern.create(req.body);
    res.status(201).json({ intern });
  } catch (error) { res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Email or registration number is already in use." : error.message }); }
});

router.patch("/interns/:id", async (req, res) => {
  if (!validInternInput(req.body)) return res.status(400).json({ message: "Complete all intern details before saving." });
  try {
    const intern = await Intern.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!intern) return res.status(404).json({ message: "Intern not found" });
    res.json({ intern });
  } catch (error) { res.status(error.code === 11000 ? 409 : 400).json({ message: error.message }); }
});

router.patch("/interns/:id/status", async (req, res) => {
  if (!["active", "blocked"].includes(req.body.status)) return res.status(400).json({ message: "Status must be active or blocked." });
  const intern = await Intern.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!intern) return res.status(404).json({ message: "Intern not found" });
  res.json({ intern });
});

router.delete("/interns/:id", async (req, res) => {
  const intern = await Intern.findByIdAndDelete(req.params.id);
  if (!intern) return res.status(404).json({ message: "Intern not found" });
  await Promise.all([
    InternClass.updateMany({ assignedInterns: intern._id }, { $pull: { assignedInterns: intern._id } }),
    InternCertificate.deleteOne({ intern: intern._id }),
  ]);
  res.json({ message: "Intern deleted" });
});

router.get("/classes", async (req, res) => {
  const classes = await InternClass.find().populate("assignedInterns", "internId name email").sort({ updatedAt: -1 });
  res.json({ classes });
});

router.post("/classes", upload.fields(classUploadFields()), async (req, res) => {
  try {
    const modules = addModuleUploads(parseJson(req.body.modules, []), req.files);
    const assignedInterns = parseJson(req.body.assignedInternIds, []);
    if (!String(req.body.title || "").trim()) return res.status(400).json({ message: "Class title is required." });
    const course = await InternClass.create({ title: req.body.title, description: req.body.description, duration: req.body.duration, subject: req.body.subject, assignedInterns, modules, status: req.body.status === "published" ? "published" : "draft" });
    res.status(201).json({ course });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.patch("/classes/:id", upload.fields(classUploadFields()), async (req, res) => {
  try {
    const modules = addModuleUploads(parseJson(req.body.modules, []), req.files);
    const assignedInterns = parseJson(req.body.assignedInternIds, []);
    const course = await InternClass.findByIdAndUpdate(req.params.id, { title: req.body.title, description: req.body.description, duration: req.body.duration, subject: req.body.subject, assignedInterns, modules, status: req.body.status === "published" ? "published" : "draft" }, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: "Class not found" });
    res.json({ course });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete("/classes/:id", async (req, res) => {
  const course = await InternClass.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: "Class not found" });
  res.json({ message: "Class deleted" });
});

router.get("/certificates", async (req, res) => {
  const certificates = await InternCertificate.find().populate("intern").sort({ createdAt: -1 });
  res.json({ certificates });
});

router.post("/certificates", async (req, res) => {
  const ids = [...new Set(parseJson(req.body.internIds, []))];
  if (!ids.length) return res.status(400).json({ message: "Select at least one intern." });
  const alreadyIssued = await InternCertificate.find({ intern: { $in: ids } }).distinct("intern");
  const existing = new Set(alreadyIssued.map(String));
  const interns = await Intern.find({ _id: { $in: ids }, status: "active" });
  const certificates = await Promise.all(interns.filter((intern) => !existing.has(String(intern._id))).map((intern) => InternCertificate.create({ intern: intern._id })));
  res.status(201).json({ certificates, skipped: ids.length - certificates.length });
});

router.post("/certificates/send", async (req, res) => {
  const deliveries = parseJson(req.body.deliveries, []);
  if (!deliveries.length) return res.status(400).json({ message: "No certificate files were provided." });
  const results = [];
  for (const item of deliveries) {
    const certificate = await InternCertificate.findOne({ certificateNumber: item.certificateNumber }).populate("intern");
    if (!certificate || !certificate.intern || !item.certificatePdf || !item.offerPdf) {
      results.push({ certificateNumber: item.certificateNumber, sent: false, message: "Certificate or PDF attachment is missing." });
      continue;
    }
    const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
    const intern = certificate.intern;
    try {
      await sendMail({
        to: intern.email,
        subject: `Your internship certificate and offer letter | ${intern.internId}`,
        html: `<div style="font-family:Arial,sans-serif;color:#202b35;max-width:640px;margin:auto"><div style="border-bottom:4px solid #f4610b;padding:20px 0"><strong style="font-size:20px">Today Technologies Pvt Ltd</strong></div><p>Dear ${escapeHtml(intern.name)},</p><p>Congratulations on your internship journey with us. Your certificate and offer letter are attached to this email.</p><p><strong>Intern ID:</strong> ${escapeHtml(intern.internId)}<br><strong>Domain:</strong> ${escapeHtml(intern.domain)}</p><p>We wish you continued success.</p><p>Regards,<br>Today Technologies Pvt Ltd<br><a href="mailto:info@todaytechnologies.co.in">info@todaytechnologies.co.in</a></p></div>`,
        attachments: [
          { filename: `internship-certificate-${intern.internId.replaceAll("/", "-")}.pdf`, content: Buffer.from(item.certificatePdf, "base64"), contentType: "application/pdf" },
          { filename: `offer-letter-${intern.internId.replaceAll("/", "-")}.pdf`, content: Buffer.from(item.offerPdf, "base64"), contentType: "application/pdf" },
        ],
      });
      certificate.emailedAt = new Date();
      await certificate.save();
      results.push({ certificateNumber: certificate.certificateNumber, sent: true });
    } catch (error) {
      results.push({ certificateNumber: certificate.certificateNumber, sent: false, message: error.message });
    }
  }
  res.json({ results });
});

module.exports = router;