const passport = require('passport');
const { dbRun, dbGet, uuidv4 } = require('./database');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(new GoogleStrategy({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback', scope: ['profile', 'email'] }, async (at, rt, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(null, false, { message: 'No email' });
      let oauth = await dbGet('SELECT * FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?', ['google', profile.id]);
      let user;
      if (oauth) {
        user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [oauth.user_id]);
        if (!user) return done(null, false);
        await dbRun('UPDATE oauth_accounts SET access_token = ?, refresh_token = ? WHERE id = ?', [at, rt, oauth.id]);
      } else {
        user = await dbGet('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
        if (user) await dbRun('INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, provider_email, provider_data, access_token, refresh_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), user.id, 'google', profile.id, email, JSON.stringify(profile._json), at, rt]);
        else {
          const uid = uuidv4(), now = new Date().toISOString();
          await dbRun('INSERT INTO users (id, email, email_verified, role, status, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?)', [uid, email, 'user', 'active', now, now]);
          await dbRun('INSERT INTO user_profiles (id, user_id, first_name, last_name, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [uuidv4(), uid, profile.name.givenName, profile.name.familyName, profile.displayName || profile.name.givenName, now, now]);
          await dbRun('INSERT INTO user_preferences (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)', [uuidv4(), uid, now, now]);
          await dbRun('INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, provider_email, provider_data, access_token, refresh_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), uid, 'google', profile.id, email, JSON.stringify(profile._json), at, rt]);
          user = await dbGet('SELECT * FROM users WHERE id = ?', [uid]);
        }
      }
      return done(null, user);
    } catch (e) { return done(e, false); }
  }));
} else console.log('Google OAuth not configured.');
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => { try { const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [id]); done(null, user); } catch (e) { done(e, null); } });
module.exports = passport;
