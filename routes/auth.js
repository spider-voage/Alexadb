const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { dbRun, dbGet, dbAll, uuidv4 } = require('../config/database');
const { generateTokens, verifyRefreshToken, authenticate } = require('../middleware/auth');
const { authLimiter, otpResendLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation, handleValidationErrors } = require('../middleware/validation');
const { sendEmail } = require('../config/mailer');
const { getClientInfo, generateSecureToken, hashToken } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');
const { getRegistrationEmail, getPasswordResetEmail, getMagicLoginEmail, getEmailVerificationEmail, getPasswordChangedEmail, getSuspiciousLoginEmail, getWelcomeEmail } = require('../templates/emails');

const router = express.Router();
const SALT_ROUNDS = 12;
const PASSWORD_RESET_EXPIRY = 3600000;
const MAGIC_LINK_EXPIRY = 900000;
const OTP_EXPIRY = 600000;

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);

const createSession = async (userId, req) => {
  const sessionId = uuidv4();
  const clientInfo = getClientInfo(req);
  const { accessToken, refreshToken } = generateTokens(userId, sessionId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await dbRun(
    `INSERT INTO sessions (id, user_id, token, refresh_token, device_fingerprint, ip_address, user_agent, device_info, location, expires_at, refresh_expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, userId, accessToken, refreshToken, clientInfo.deviceFingerprint, clientInfo.ip, clientInfo.userAgent, clientInfo.deviceInfo, clientInfo.location, expiresAt.toISOString(), refreshExpiresAt.toISOString(), now.toISOString(), now.toISOString()]
  );
  const refreshTokenHash = hashToken(refreshToken);
  await dbRun(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, session_id, device_fingerprint, ip_address, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userId, refreshTokenHash, sessionId, clientInfo.deviceFingerprint, clientInfo.ip, refreshExpiresAt.toISOString(), now.toISOString()]
  );
  return { accessToken, refreshToken, sessionId };
};

const invalidateSession = async (sessionId) => {
  await dbRun('UPDATE sessions SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), sessionId]);
  await dbRun('UPDATE refresh_tokens SET revoked_at = ? WHERE session_id = ?', [new Date().toISOString(), sessionId]);
};

const invalidateAllUserSessions = async (userId, exceptSessionId = null) => {
  const query = exceptSessionId
    ? 'UPDATE sessions SET is_active = 0, updated_at = ? WHERE user_id = ? AND id != ?'
    : 'UPDATE sessions SET is_active = 0, updated_at = ? WHERE user_id = ?';
  const params = exceptSessionId ? [new Date().toISOString(), userId, exceptSessionId] : [new Date().toISOString(), userId];
  await dbRun(query, params);
  const rtQuery = exceptSessionId
    ? 'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND session_id != ?'
    : 'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ?';
  const rtParams = exceptSessionId ? [new Date().toISOString(), userId, exceptSessionId] : [new Date().toISOString(), userId];
  await dbRun(rtQuery, rtParams);
};

const generateOTP = () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  return { otp, otpHash };
};

const storeOTP = async (userId, otpHash) => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY).toISOString();
  await dbRun(
    `INSERT INTO otp_codes (id, user_id, otp_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET otp_hash = excluded.otp_hash, expires_at = excluded.expires_at, attempts = 0, used_at = NULL, updated_at = ?`,
    [uuidv4(), userId, otpHash, expiresAt, new Date().toISOString(), new Date().toISOString()]
  );
};

const verifyOTP = async (userId, otp) => {
  const otpRecord = await dbGet('SELECT * FROM otp_codes WHERE user_id = ?', [userId]);
  if (!otpRecord) return { valid: false, message: 'No OTP found. Please request a new one.' };
  if (otpRecord.used_at) return { valid: false, message: 'This OTP has already been used.' };
  if (new Date(otpRecord.expires_at) < new Date()) return { valid: false, message: 'OTP has expired. Please request a new one.' };
  if (otpRecord.attempts >= 5) return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (otpHash !== otpRecord.otp_hash) {
    await dbRun('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otpRecord.id]);
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }
  await dbRun('UPDATE otp_codes SET used_at = ? WHERE id = ?', [new Date().toISOString(), otpRecord.id]);
  return { valid: true };
};

const sendOTPEmail = async (email, otp, firstName) => {
  const subject = 'Your AlexaDB Login Code';
  const html = getRegistrationEmail({ firstName: firstName || 'there', otp });
  await sendEmail({ to: email, subject, html });
};

// Register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (existingUser) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'user', 'active', ?, ?)`,
      [userId, email, passwordHash, now, now]
    );
    await dbRun(
      `INSERT INTO user_profiles (id, user_id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, firstName || null, lastName || null, now, now]
    );
    await dbRun(
      `INSERT INTO user_preferences (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [uuidv4(), userId, now, now]
    );
    const verificationToken = generateSecureToken(32);
    const tokenHash = hashToken(verificationToken);
    await dbRun(
      `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), userId, tokenHash, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), now]
    );
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    await sendEmail({ to: email, subject: 'Welcome to AlexaDB - Verify Your Email', html: getWelcomeEmail({ firstName: firstName || 'there', verificationUrl }) });
    await logAudit({ userId, action: 'USER_REGISTERED', entityType: 'user', entityId: userId, ipAddress: getClientInfo(req).ip });
    res.status(201).json({ success: true, message: 'Account created successfully. Please check your email to verify your account.', data: { userId } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'An error occurred during registration. Please try again.' });
  }
});

// Login
router.post('/login', loginValidation, authLimiter, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (user.status === 'banned') return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    if (user.locked_until && new Date(user.locked_until) > new Date()) return res.status(403).json({ success: false, message: 'Account temporarily locked. Please try again later.' });
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      if (newAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await dbRun('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [newAttempts, lockUntil, user.id]);
        await logAudit({ userId: user.id, action: 'ACCOUNT_LOCKED', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
        return res.status(403).json({ success: false, message: 'Too many failed attempts. Account locked for 30 minutes.' });
      }
      await dbRun('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
      await logAudit({ userId: user.id, action: 'LOGIN_FAILED', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    await dbRun('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ?, last_login_ip = ? WHERE id = ?', [new Date().toISOString(), getClientInfo(req).ip, user.id]);
    if (user.two_factor_enabled) {
      const { otp, otpHash } = generateOTP();
      await storeOTP(user.id, otpHash);
      const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [user.id]);
      await sendOTPEmail(user.email, otp, profile?.first_name);
      await logAudit({ userId: user.id, action: '2FA_CODE_SENT', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
      return res.json({ success: true, message: 'Please check your email for the verification code.', data: { requires2FA: true, userId: user.id } });
    }
    const tokens = await createSession(user.id, req);
    await logAudit({ userId: user.id, action: 'LOGIN_SUCCESS', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
    const profile = await dbGet('SELECT first_name, last_name, display_name FROM user_profiles WHERE user_id = ?', [user.id]);
    res.json({ success: true, message: 'Login successful.', data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, email: user.email, role: user.role, first_name: profile?.first_name, last_name: profile?.last_name, display_name: profile?.display_name, email_verified: user.email_verified === 1 } } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'An error occurred during login. Please try again.' });
  }
});

// Verify 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ success: false, message: 'User ID and OTP are required.' });
    const otpResult = await verifyOTP(userId, otp);
    if (!otpResult.valid) return res.status(400).json({ success: false, message: otpResult.message });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const tokens = await createSession(user.id, req);
    await logAudit({ userId: user.id, action: '2FA_VERIFIED', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
    const profile = await dbGet('SELECT first_name, last_name, display_name FROM user_profiles WHERE user_id = ?', [user.id]);
    res.json({ success: true, message: 'Login successful.', data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, email: user.email, role: user.role, first_name: profile?.first_name, last_name: profile?.last_name, display_name: profile?.display_name, email_verified: user.email_verified === 1 } } });
  } catch (err) {
    console.error('2FA verification error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Resend OTP
router.post('/resend-otp', otpResendLimiter, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const { otp, otpHash } = generateOTP();
    await storeOTP(userId, otpHash);
    const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [userId]);
    await sendOTPEmail(user.email, otp, profile?.first_name);
    await logAudit({ userId, action: 'OTP_RESENT', entityType: 'user', entityId: userId, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });
    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const storedToken = await dbGet('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime("now")', [tokenHash]);
    if (!storedToken) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [decoded.userId]);
    if (!user || user.status !== 'active') return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    await invalidateSession(decoded.sessionId);
    const tokens = await createSession(user.id, req);
    await logAudit({ userId: user.id, action: 'TOKEN_REFRESHED', entityType: 'session', entityId: decoded.sessionId, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Token refreshed.', data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Refresh token expired.' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    console.error('Token refresh error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await invalidateSession(req.session.id);
    await logAudit({ userId: req.user.id, action: 'LOGOUT', entityType: 'session', entityId: req.session.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Logout all
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await invalidateAllUserSessions(req.user.id, req.session.id);
    await logAudit({ userId: req.user.id, action: 'LOGOUT_ALL', entityType: 'user', entityId: req.user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Logged out from all devices except this one.' });
  } catch (err) {
    console.error('Logout all error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Me
router.get('/me', authenticate, async (req, res) => {
  try {
    const profile = await dbGet('SELECT first_name, last_name, display_name, avatar_url FROM user_profiles WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, data: { user: { id: req.user.id, email: req.user.email, role: req.user.role, status: req.user.status, email_verified: req.user.email_verified === 1, first_name: profile?.first_name, last_name: profile?.last_name, display_name: profile?.display_name, avatar_url: profile?.avatar_url } } });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user) return res.json({ success: true, message: 'If an account exists with this email, you will receive a password reset link.' });
    await dbRun('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
    const resetToken = generateSecureToken(32);
    const tokenHash = hashToken(resetToken);
    await dbRun(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, tokenHash, new Date(Date.now() + PASSWORD_RESET_EXPIRY).toISOString(), getClientInfo(req).ip, new Date().toISOString()]
    );
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [user.id]);
    await sendEmail({ to: email, subject: 'Password Reset Request', html: getPasswordResetEmail({ firstName: profile?.first_name || 'there', resetUrl }) });
    await logAudit({ userId: user.id, action: 'PASSWORD_RESET_REQUESTED', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Reset password
router.post('/reset-password/:token', resetPasswordValidation, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const tokenHash = hashToken(token);
    const resetRecord = await dbGet('SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime("now")', [tokenHash]);
    if (!resetRecord) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [resetRecord.user_id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const passwordHash = await hashPassword(password);
    await dbRun('UPDATE users SET password_hash = ?, updated_at = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [passwordHash, new Date().toISOString(), user.id]);
    await dbRun('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [new Date().toISOString(), resetRecord.id]);
    await invalidateAllUserSessions(user.id);
    const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [user.id]);
    await sendEmail({ to: user.email, subject: 'Password Changed Successfully', html: getPasswordChangedEmail({ firstName: profile?.first_name || 'there' }) });
    await logAudit({ userId: user.id, action: 'PASSWORD_RESET', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required.' });
    const tokenHash = hashToken(token);
    const verificationRecord = await dbGet('SELECT * FROM email_verification_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime("now")', [tokenHash]);
    if (!verificationRecord) return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [verificationRecord.user_id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    await dbRun('UPDATE users SET email_verified = 1, email_verified_at = ? WHERE id = ?', [new Date().toISOString(), user.id]);
    await dbRun('UPDATE email_verification_tokens SET used_at = ? WHERE id = ?', [new Date().toISOString(), verificationRecord.id]);
    await logAudit({ userId: user.id, action: 'EMAIL_VERIFIED', entityType: 'user', entityId: user.id });
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Magic link
router.post('/magic-link', forgotPasswordValidation, authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user) return res.json({ success: true, message: 'If an account exists with this email, you will receive a magic login link.' });
    await dbRun('DELETE FROM magic_login_tokens WHERE user_id = ?', [user.id]);
    const magicToken = generateSecureToken(32);
    const tokenHash = hashToken(magicToken);
    await dbRun(
      `INSERT INTO magic_login_tokens (id, user_id, token_hash, expires_at, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, tokenHash, new Date(Date.now() + MAGIC_LINK_EXPIRY).toISOString(), getClientInfo(req).ip, new Date().toISOString()]
    );
    const magicUrl = `${process.env.APP_URL || 'http://localhost:3000'}/magic-login?token=${magicToken}`;
    const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [user.id]);
    await sendEmail({ to: email, subject: 'Your Magic Login Link', html: getMagicLoginEmail({ firstName: profile?.first_name || 'there', magicUrl }) });
    await logAudit({ userId: user.id, action: 'MAGIC_LINK_SENT', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'If an account exists with this email, you will receive a magic login link.' });
  } catch (err) {
    console.error('Magic link error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Verify magic link
router.get('/magic-login/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Magic token is required.' });
    const tokenHash = hashToken(token);
    const magicRecord = await dbGet('SELECT * FROM magic_login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime("now")', [tokenHash]);
    if (!magicRecord) return res.status(400).json({ success: false, message: 'Invalid or expired magic link.' });
    const user = await dbGet('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [magicRecord.user_id]);
    if (!user || user.status !== 'active') return res.status(404).json({ success: false, message: 'User not found or inactive.' });
    await dbRun('UPDATE magic_login_tokens SET used_at = ? WHERE id = ?', [new Date().toISOString(), magicRecord.id]);
    const tokens = await createSession(user.id, req);
    await logAudit({ userId: user.id, action: 'MAGIC_LOGIN', entityType: 'user', entityId: user.id, ipAddress: getClientInfo(req).ip });
    const profile = await dbGet('SELECT first_name, last_name, display_name FROM user_profiles WHERE user_id = ?', [user.id]);
    res.json({ success: true, message: 'Login successful.', data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, email: user.email, role: user.role, first_name: profile?.first_name, last_name: profile?.last_name, display_name: profile?.display_name, email_verified: user.email_verified === 1 } } });
  } catch (err) {
    console.error('Magic login verify error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

module.exports = router;
