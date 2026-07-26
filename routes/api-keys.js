const express = require('express');
const { dbRun, dbGet, dbAll, uuidv4 } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getClientInfo, generateSecureToken, hashToken } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// List API keys
router.get('/', async (req, res) => {
  try {
    const keys = await dbAll(
      `SELECT id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at
       FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: { apiKeys: keys } });
  } catch (err) {
    console.error('List API keys error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch API keys.' });
  }
});

// Create API key
router.post('/', async (req, res) => {
  try {
    const { name, scopes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

    const keyCount = await dbGet('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND revoked_at IS NULL', [req.user.id]);
    if (keyCount.count >= 10) return res.status(400).json({ success: false, message: 'Maximum 10 API keys allowed.' });

    const id = uuidv4();
    const rawKey = `adb_${generateSecureToken(32)}`;
    const keyHash = hashToken(rawKey);
    const keyPrefix = rawKey.slice(0, 12);
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name, keyHash, keyPrefix, scopes || 'read', now]
    );

    await logAudit({ userId: req.user.id, action: 'API_KEY_CREATED', entityType: 'api_key', entityId: id, ipAddress: getClientInfo(req).ip });

    res.status(201).json({ success: true, message: 'API key created.', data: { apiKey: { id, name, key: rawKey, keyPrefix, scopes: scopes || 'read', created_at: now } } });
  } catch (err) {
    console.error('Create API key error:', err);
    res.status(500).json({ success: false, message: 'Failed to create API key.' });
  }
});

// Revoke API key
router.delete('/:id', async (req, res) => {
  try {
    const key = await dbGet('SELECT * FROM api_keys WHERE id = ? AND user_id = ? AND revoked_at IS NULL', [req.params.id, req.user.id]);
    if (!key) return res.status(404).json({ success: false, message: 'API key not found.' });
    await dbRun('UPDATE api_keys SET revoked_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'API_KEY_REVOKED', entityType: 'api_key', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'API key revoked.' });
  } catch (err) {
    console.error('Revoke API key error:', err);
    res.status(500).json({ success: false, message: 'Failed to revoke API key.' });
  }
});

module.exports = router;
