const express = require('express');
const { dbRun, dbGet, dbAll } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getClientInfo } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');
const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
    const activeUsers = await dbGet('SELECT COUNT(*) as count FROM users WHERE status = "active" AND deleted_at IS NULL');
    const totalDatabases = await dbGet('SELECT COUNT(*) as count FROM databases WHERE deleted_at IS NULL');
    const activeDatabases = await dbGet('SELECT COUNT(*) as count FROM databases WHERE status = "active" AND deleted_at IS NULL');
    const totalBuckets = await dbGet('SELECT COUNT(*) as count FROM buckets WHERE deleted_at IS NULL');
    const totalApiKeys = await dbGet('SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL');
    const recentUsers = await dbAll('SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10');
    res.json({ success: true, data: { stats: { totalUsers: totalUsers.count, activeUsers: activeUsers.count, totalDatabases: totalDatabases.count, activeDatabases: activeDatabases.count, totalBuckets: totalBuckets.count, totalApiKeys: totalApiKeys.count }, recentUsers } });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch stats.' }); }
});

router.get('/users', async (req, res) => {
  try { const users = await dbAll('SELECT id, email, role, status, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50'); res.json({ success: true, data: { users } }); }
  catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch users.' }); }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { role, status } = req.body;
    await dbRun('UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status), updated_at = ? WHERE id = ?', [role, status, new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'USER_UPDATED', entityType: 'user', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'User updated.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update user.' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await dbRun('UPDATE users SET status = ?, deleted_at = ? WHERE id = ?', ['deleted', new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'USER_DELETED', entityType: 'user', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete user.' }); }
});

module.exports = router;
