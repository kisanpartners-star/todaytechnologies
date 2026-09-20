require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const passport = require("passport");
const connectDB = require("./config/db");
require("./config/passport");

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(passport.initialize());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve the built frontend
app.use(express.static(path.join(__dirname, "dist")));

// For any non-API route, send back index.html (needed for client-side routing)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Routes
app.use("/api/admin", require("./routes/adminAuth"));
app.use("/api/auth", require("./routes/candidateAuth"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/technology-clients", require("./routes/technologyClients"));
app.use("/api/internship-applications", require("./routes/internshipApplications"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// 404 + error handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
