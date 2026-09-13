const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { protectCandidate } = require("../middleware/auth");

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

// GET /api/auth/google  -> redirects to Google consent screen
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login-failed`,
  }),
  (req, res) => {
    const token = signToken(req.user._id);
    // Redirect back to the frontend with the token; the SPA stores it.
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// GET /api/auth/me
router.get("/me", protectCandidate, async (req, res) => {
  res.json({ candidate: req.user });
});

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out. Please discard the token client-side." });
});

module.exports = router;
