const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = path.join(__dirname, "..", "uploads");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route files into subfolders by field name for tidiness
    const sub = file.fieldname || "misc";
    const dest = path.join(uploadRoot, sub);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common document/image/video types
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|mp4|mov|avi/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type: " + ext));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

module.exports = upload;
