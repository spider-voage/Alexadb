const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { dbRun, dbGet, dbAll, uuidv4 } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { updateProfileValidation, changePasswordValidation, changeEmailValidation, handleValidationErrors } = require('../middleware/validation');
const { sendEmail } = require('../config/mailer');
const { getClientInfo, generateSecureToken, hashToken } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');
const { getPasswordChangedEmail, getEmailChangedEmail } = require('../templates/emails');

const router = express.Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, path.join(__dirname, '..', 'public', 'uploads')); },
  filename: (req, file, cb) => { const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname)); }
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed.'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/profile', async (req, res) => {
  try {
    const profile = await dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [req.user.id]);
    const preferences = await dbGet('SELECT * FROM user_preferences WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, data: { profile: profile || {}, preferences: preferences || {} } });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

router.patch('/profile', updateProfileValidation, async (req, res) => {
  try {
    const { firstName, lastName, displayName, bio, phone, company, jobTitle, website, location } = req.body;
    const now = new Date().toISOString();
    await dbRun(
      `UPDATE user_profiles SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), phone = COALESCE(?, phone), company = COALESCE(?, company), job_title = COALESCE(?, job_title), website = COALESCE(?, website), location = COALESCE(?, location), updated_at = ? WHERE user_id = ?`,
      [firstName, lastName, displayName, bio, phone, company, jobTitle, website, location, now, req.user.id]
    );
    await logAudit({ userId: req.user.id, action: 'PROFILE_UPDATED', entityType: 'user', entityId: req.user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    await dbRun('UPDATE user_profiles SET avatar_url = ?, updated_at = ? WHERE user_id = ?', [avatarUrl, new Date().toISOString(), req.user.id]);
    await logAudit({ userId: req.user.id, action: 'AVATAR_UPDATED', entityType: 'user', entityId: req.user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Avatar updated.', data: { avatarUrl } });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload avatar.' });
  }
});

router.patch('/change-password', changePasswordValidation, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await dbRun('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, new Date().toISOString(), req.user.id]);
    await invalidateAllUserSessions(req.user.id, req.session.id);
    const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [req.user.id]);
    await sendEmail({ to: req.user.email, subject: 'Password Changed', html: getPasswordChangedEmail({ firstName: profile?.first_name || 'there' }) });
    await logAudit({ userId: req.user.id, action: 'PASSWORD_CHANGED', entityType: 'user', entityId: req.user.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Password changed successfully. You have been logged out from all other devices.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

router.patch('/change-email', changeEmailValidation, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Password is incorrect.' });
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL', [newEmail, req.user.id]);
    if (existingUser) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const oldEmail = user.email;
    await dbRun('UPDATE users SET email = ?, email_verified = 0, updated_at = ? WHERE id = ?', [newEmail, new Date().toISOString(), req.user.id]);
    const profile = await dbGet('SELECT first_name FROM user_profiles WHERE user_id = ?', [req.user.id]);
    await sendEmail({ to: oldEmail, subject: 'Email Address Changed', html: getEmailChangedEmail({ firstName: profile?.first_name || 'there', newEmail }) });
    await logAudit({ userId: req.user.id, action: 'EMAIL_CHANGED', entityType: 'user', entityId: req.user.id, ipAddress: getClientInfo(req).ip, oldValue: oldEmail, newValue: newEmail });
    res.json({ success: true, message: 'Email changed successfully. Please verify your new email address.' });
  } catch (err) {
    console.error('Change email error:', err);
    res.status(500).json({ success: false, message: 'Failed to change email.' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await dbAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    const unreadCount = await dbGet('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
    res.json({ success: true, data: { notifications, unreadCount: unreadCount.count } });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?', [new Date().toISOString(), req.params.id, req.user.id]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [new Date().toISOString(), req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
});

router.get('/login-history', async (req, res) => {
  try {
    const history = await dbAll('SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json({ success: true, data: { loginHistory: history } });
  } catch (err) {
    console.error('Get login history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch login history.' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await dbAll('SELECT * FROM sessions WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, data: { sessions } });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    await dbRun('UPDATE sessions SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
    await dbRun('UPDATE refresh_tokens SET revoked_at = ? WHERE session_id = ?', [new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'SESSION_REVOKED', entityType: 'session', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Session revoked.' });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ success: false, message: 'Failed to revoke session.' });
  }
});

module.exports = router;
