const express = require('express');
const { dbRun, dbGet, dbAll, uuidv4 } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getClientInfo } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// List buckets
router.get('/', async (req, res) => {
  try {
    const buckets = await dbAll(
      `SELECT id, name, type, status, endpoint, region, size_mb, file_count, public_access, cors_enabled, created_at, updated_at
       FROM buckets WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [req.user.id]
    );
    const stats = await dbGet(
      `SELECT COUNT(*) as total, SUM(size_mb) as total_size, SUM(file_count) as total_files
       FROM buckets WHERE user_id = ? AND deleted_at IS NULL`,
      [req.user.id]
    );
    res.json({ success: true, data: { buckets, stats } });
  } catch (err) {
    console.error('List buckets error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch buckets.' });
  }
});

// Create bucket
router.post('/', async (req, res) => {
  try {
    const { name, type, region, publicAccess, corsEnabled } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

    const existing = await dbGet('SELECT * FROM buckets WHERE name = ? AND user_id = ? AND deleted_at IS NULL', [name, req.user.id]);
    if (existing) return res.status(409).json({ success: false, message: 'A bucket with this name already exists.' });

    const id = uuidv4();
    const endpoint = `https://storage.alexadb.pro/${req.user.id.slice(0, 8)}/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO buckets (id, user_id, name, type, status, endpoint, region, public_access, cors_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name, type || 's3', endpoint, region || 'us-east-1', publicAccess ? 1 : 0, corsEnabled ? 1 : 0, now, now]
    );

    await logAudit({ userId: req.user.id, action: 'BUCKET_CREATED', entityType: 'bucket', entityId: id, ipAddress: getClientInfo(req).ip });

    const bucket = await dbGet('SELECT * FROM buckets WHERE id = ?', [id]);
    res.status(201).json({ success: true, message: 'Bucket created.', data: { bucket } });
  } catch (err) {
    console.error('Create bucket error:', err);
    res.status(500).json({ success: false, message: 'Failed to create bucket.' });
  }
});

// Get single bucket
router.get('/:id', async (req, res) => {
  try {
    const bucket = await dbGet(
      `SELECT id, name, type, status, endpoint, region, size_mb, file_count, public_access, cors_enabled, created_at, updated_at
       FROM buckets WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (!bucket) return res.status(404).json({ success: false, message: 'Bucket not found.' });
    res.json({ success: true, data: { bucket } });
  } catch (err) {
    console.error('Get bucket error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bucket.' });
  }
});

// Update bucket
router.patch('/:id', async (req, res) => {
  try {
    const { publicAccess, corsEnabled } = req.body;
    const bucket = await dbGet('SELECT * FROM buckets WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!bucket) return res.status(404).json({ success: false, message: 'Bucket not found.' });

    await dbRun(
      'UPDATE buckets SET public_access = COALESCE(?, public_access), cors_enabled = COALESCE(?, cors_enabled), updated_at = ? WHERE id = ?',
      [publicAccess !== undefined ? (publicAccess ? 1 : 0) : null, corsEnabled !== undefined ? (corsEnabled ? 1 : 0) : null, new Date().toISOString(), req.params.id]
    );

    await logAudit({ userId: req.user.id, action: 'BUCKET_UPDATED', entityType: 'bucket', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Bucket updated.' });
  } catch (err) {
    console.error('Update bucket error:', err);
    res.status(500).json({ success: false, message: 'Failed to update bucket.' });
  }
});

// Delete bucket
router.delete('/:id', async (req, res) => {
  try {
    const bucket = await dbGet('SELECT * FROM buckets WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!bucket) return res.status(404).json({ success: false, message: 'Bucket not found.' });
    await dbRun('UPDATE buckets SET status = ?, deleted_at = ? WHERE id = ?', ['deleted', new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'BUCKET_DELETED', entityType: 'bucket', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Bucket deleted.' });
  } catch (err) {
    console.error('Delete bucket error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete bucket.' });
  }
});

module.exports = router;
