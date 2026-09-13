const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Candidate = require("../models/Candidate");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let candidate = await Candidate.findOne({ googleId: profile.id });

        if (!candidate) {
          candidate = await Candidate.findOne({
            email: profile.emails?.[0]?.value,
          });
        }

        if (candidate) {
          candidate.googleId = profile.id;
          candidate.name = candidate.name || profile.displayName;
          candidate.profilePhoto =
            candidate.profilePhoto || profile.photos?.[0]?.value;
          await candidate.save();
          return done(null, candidate);
        }

        candidate = await Candidate.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          profilePhoto: profile.photos?.[0]?.value,
        });

        return done(null, candidate);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const candidate = await Candidate.findById(id);
    done(null, candidate);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
