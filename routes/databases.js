const express = require('express');
const { dbRun, dbGet, dbAll, uuidv4 } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getClientInfo } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// Helper to generate connection string
const generateConnectionString = (type, host, port, username, password, dbName) => {
  const protocols = {
    postgresql: `postgresql://${username}:${password}@${host}:${port}/${dbName}`,
    mysql: `mysql://${username}:${password}@${host}:${port}/${dbName}`,
    mongodb: `mongodb://${username}:${password}@${host}:${port}/${dbName}`,
    redis: `redis://${username}:${password}@${host}:${port}`,
    sqlite: `sqlite://${host}/${dbName}.db`,
    mariadb: `mariadb://${username}:${password}@${host}:${port}/${dbName}`
  };
  return protocols[type] || '';
};

const generateHost = () => `db.alexadb.pro`;
const generatePort = (type) => {
  const ports = { postgresql: 5432, mysql: 3306, mongodb: 27017, redis: 6379, sqlite: 0, mariadb: 3306 };
  return ports[type] || 5432;
};
const generateDbName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '_');

// List user's databases
router.get('/', async (req, res) => {
  try {
    const databases = await dbAll(
      `SELECT id, name, type, status, connection_string, host, port, database_name, size_mb, storage_used_mb, queries_count, last_accessed_at, engine_version, region, plan, created_at, updated_at
       FROM databases WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [req.user.id]
    );
    const stats = await dbGet(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM databases WHERE user_id = ? AND deleted_at IS NULL`,
      [req.user.id]
    );
    res.json({ success: true, data: { databases, stats } });
  } catch (err) {
    console.error('List databases error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch databases.' });
  }
});

// Create database
router.post('/', async (req, res) => {
  try {
    const { name, type, region, plan } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'Name and type are required.' });

    const existing = await dbGet('SELECT * FROM databases WHERE name = ? AND user_id = ? AND deleted_at IS NULL', [name, req.user.id]);
    if (existing) return res.status(409).json({ success: false, message: 'A database with this name already exists.' });

    const id = uuidv4();
    const dbName = generateDbName(name);
    const host = generateHost();
    const port = generatePort(type);
    const username = `user_${req.user.id.slice(0, 8)}`;
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const connString = generateConnectionString(type, host, port, username, password, dbName);
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO databases (id, user_id, name, type, status, connection_string, host, port, username, password, database_name, region, plan, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'building', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name, type, connString, host, port, username, password, dbName, region || 'us-east-1', plan || 'free', now, now]
    );

    // Simulate provisioning
    setTimeout(async () => {
      await dbRun('UPDATE databases SET status = ?, engine_version = ?, updated_at = ? WHERE id = ?',
        ['active', type === 'postgresql' ? '15.4' : type === 'mysql' ? '8.0' : '7.0', new Date().toISOString(), id]);
    }, 3000);

    await logAudit({ userId: req.user.id, action: 'DATABASE_CREATED', entityType: 'database', entityId: id, ipAddress: getClientInfo(req).ip });

    const dbRecord = await dbGet('SELECT * FROM databases WHERE id = ?', [id]);
    res.status(201).json({ success: true, message: 'Database is being provisioned.', data: { database: dbRecord } });
  } catch (err) {
    console.error('Create database error:', err);
    res.status(500).json({ success: false, message: 'Failed to create database.' });
  }
});

// Get single database
router.get('/:id', async (req, res) => {
  try {
    const dbRecord = await dbGet(
      `SELECT id, name, type, status, connection_string, host, port, username, database_name, size_mb, storage_used_mb, queries_count, last_accessed_at, engine_version, region, plan, created_at, updated_at
       FROM databases WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (!dbRecord) return res.status(404).json({ success: false, message: 'Database not found.' });
    res.json({ success: true, data: { database: dbRecord } });
  } catch (err) {
    console.error('Get database error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch database.' });
  }
});

// Pause database
router.patch('/:id/pause', async (req, res) => {
  try {
    const dbRecord = await dbGet('SELECT * FROM databases WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!dbRecord) return res.status(404).json({ success: false, message: 'Database not found.' });
    await dbRun('UPDATE databases SET status = ?, updated_at = ? WHERE id = ?', ['paused', new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'DATABASE_PAUSED', entityType: 'database', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Database paused.' });
  } catch (err) {
    console.error('Pause database error:', err);
    res.status(500).json({ success: false, message: 'Failed to pause database.' });
  }
});

// Resume database
router.patch('/:id/resume', async (req, res) => {
  try {
    const dbRecord = await dbGet('SELECT * FROM databases WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!dbRecord) return res.status(404).json({ success: false, message: 'Database not found.' });
    await dbRun('UPDATE databases SET status = ?, updated_at = ? WHERE id = ?', ['active', new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'DATABASE_RESUMED', entityType: 'database', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Database resumed.' });
  } catch (err) {
    console.error('Resume database error:', err);
    res.status(500).json({ success: false, message: 'Failed to resume database.' });
  }
});

// Delete database
router.delete('/:id', async (req, res) => {
  try {
    const dbRecord = await dbGet('SELECT * FROM databases WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!dbRecord) return res.status(404).json({ success: false, message: 'Database not found.' });
    await dbRun('UPDATE databases SET status = ?, deleted_at = ? WHERE id = ?', ['deleted', new Date().toISOString(), req.params.id]);
    await logAudit({ userId: req.user.id, action: 'DATABASE_DELETED', entityType: 'database', entityId: req.params.id, ipAddress: getClientInfo(req).ip });
    res.json({ success: true, message: 'Database deleted.' });
  } catch (err) {
    console.error('Delete database error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete database.' });
  }
});

// Get database stats
router.get('/:id/stats', async (req, res) => {
  try {
    const dbRecord = await dbGet('SELECT * FROM databases WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!dbRecord) return res.status(404).json({ success: false, message: 'Database not found.' });

    // Generate mock stats
    const stats = {
      queriesPerDay: Array.from({length: 7}, () => Math.floor(Math.random() * 5000) + 500),
      storageGrowth: Array.from({length: 7}, (_, i) => Math.floor((dbRecord.size_mb || 0) * (1 + i * 0.05))),
      connections: Math.floor(Math.random() * 50) + 1,
      avgQueryTime: (Math.random() * 50 + 5).toFixed(2),
      uptime: '99.9%'
    };
    res.json({ success: true, data: { stats } });
  } catch (err) {
    console.error('Database stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

module.exports = router;
