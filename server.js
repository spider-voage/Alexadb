const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { run, get, all } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'spiderdb-dev-secret-change-in-production';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/* ------------------------------------------------------------------ */
/* Auth middleware                                                    */
/* ------------------------------------------------------------------ */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

/* ------------------------------------------------------------------ */
/* Health check                                                       */
/* ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ------------------------------------------------------------------ */
/* Auth routes                                                        */
/* ------------------------------------------------------------------ */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email.toLowerCase(), passwordHash, name.trim()]
    );

    const token = jwt.sign(
      { userId: result.id, email: email.toLowerCase(), name: name.trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: result.id, email: email.toLowerCase(), name: name.trim() }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/* ------------------------------------------------------------------ */
/* Database routes                                                    */
/* ------------------------------------------------------------------ */
app.get('/api/databases', authenticateToken, async (req, res) => {
  try {
    const databases = await all(
      `SELECT d.*, dom.subdomain, dom.custom_domain
       FROM databases d
       LEFT JOIN domains dom ON d.id = dom.database_id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`,
      [req.user.userId]
    );
    res.json(databases);
  } catch (err) {
    console.error('Fetch databases error:', err);
    res.status(500).json({ error: 'Failed to fetch databases' });
  }
});

app.post('/api/databases', authenticateToken, async (req, res) => {
  try {
    const { name, type = 'postgresql' } = req.body;

    if (!name || !/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({
        error: 'Name must contain only lowercase letters, numbers, and hyphens'
      });
    }

    if (name.length < 3 || name.length > 32) {
      return res.status(400).json({ error: 'Name must be 3-32 characters' });
    }

    const existing = await get(
      'SELECT id FROM databases WHERE name = ? AND user_id = ?',
      [name, req.user.userId]
    );
    if (existing) {
      return res.status(409).json({ error: 'Database name already exists' });
    }

    const connectionString = `postgresql://db_${name}_user:****@db.spiderdb.io:5432/${name}`;

    const result = await run(
      'INSERT INTO databases (user_id, name, type, status, connection_string) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, name, type, 'pending', connectionString]
    );

    // Simulate provisioning pipeline
    setTimeout(async () => {
      try {
        await run('UPDATE databases SET status = ? WHERE id = ?', ['building', result.id]);
        setTimeout(async () => {
          try {
            await run('UPDATE databases SET status = ? WHERE id = ?', ['live', result.id]);
          } catch (e) { /* ignore */ }
        }, 4000);
      } catch (e) { /* ignore */ }
    }, 2000);

    const subdomain = `${name}-${req.user.userId}.spiderdb.io`;
    await run(
      'INSERT INTO domains (database_id, subdomain, ssl_enabled) VALUES (?, ?, 1)',
      [result.id, subdomain]
    );

    const dbRecord = await get(
      `SELECT d.*, dom.subdomain, dom.custom_domain
       FROM databases d
       LEFT JOIN domains dom ON d.id = dom.database_id
       WHERE d.id = ?`,
      [result.id]
    );

    res.status(201).json(dbRecord);
  } catch (err) {
    console.error('Create database error:', err);
    res.status(500).json({ error: 'Failed to create database' });
  }
});

app.get('/api/databases/:id', authenticateToken, async (req, res) => {
  try {
    const database = await get(
      `SELECT d.*, dom.subdomain, dom.custom_domain, dom.ssl_enabled
       FROM databases d
       LEFT JOIN domains dom ON d.id = dom.database_id
       WHERE d.id = ? AND d.user_id = ?`,
      [req.params.id, req.user.userId]
    );
    if (!database) return res.status(404).json({ error: 'Database not found' });
    res.json(database);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch database' });
  }
});

app.delete('/api/databases/:id', authenticateToken, async (req, res) => {
  try {
    const result = await run(
      'DELETE FROM databases WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Database not found' });
    res.json({ message: 'Database deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete database' });
  }
});

app.get('/api/databases/:id/logs', authenticateToken, async (req, res) => {
  try {
    const database = await get(
      'SELECT id, name, status FROM databases WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (!database) return res.status(404).json({ error: 'Database not found' });

    const now = Date.now();
    const logs = [
      { timestamp: new Date(now).toISOString(), level: 'success', message: `Database ${database.name} is ${database.status}` },
      { timestamp: new Date(now - 30000).toISOString(), level: 'info', message: 'Health check passed — all systems operational' },
      { timestamp: new Date(now - 120000).toISOString(), level: 'info', message: 'PostgreSQL background writer started' },
      { timestamp: new Date(now - 180000).toISOString(), level: 'info', message: 'SSL certificate verified' },
      { timestamp: new Date(now - 240000).toISOString(), level: 'info', message: 'Container allocated on node us-east-1' },
      { timestamp: new Date(now - 300000).toISOString(), level: 'info', message: 'Provisioning started' },
      { timestamp: new Date(now - 360000).toISOString(), level: 'info', message: `Database ${database.name} created` }
    ];

    res.json({ database: database.name, logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/* ------------------------------------------------------------------ */
/* API Keys                                                           */
/* ------------------------------------------------------------------ */
app.get('/api/api-keys', authenticateToken, async (req, res) => {
  try {
    const keys = await all(
      'SELECT id, name, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

app.post('/api/api-keys', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const key = 'spdb_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const result = await run(
      'INSERT INTO api_keys (user_id, key_hash, name) VALUES (?, ?, ?)',
      [req.user.userId, keyHash, name.trim()]
    );

    res.status(201).json({
      id: result.id,
      name: name.trim(),
      key,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

app.delete('/api/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const result = await run(
      'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
    res.json({ message: 'API key deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

/* ------------------------------------------------------------------ */
/* Analytics (simulated)                                              */
/* ------------------------------------------------------------------ */
app.get('/api/analytics/:id', authenticateToken, async (req, res) => {
  try {
    const database = await get(
      'SELECT id, name FROM databases WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (!database) return res.status(404).json({ error: 'Database not found' });

    res.json({
      database: database.name,
      requests: Math.floor(Math.random() * 50000) + 5000,
      bandwidth: (Math.random() * 50 + 5).toFixed(2) + ' GB',
      cpu: (Math.random() * 25 + 5).toFixed(1) + '%',
      memory: (Math.random() * 800 + 200).toFixed(0) + ' MB',
      errorRate: (Math.random() * 1.5).toFixed(2) + '%',
      uptime: '99.97%'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/* ------------------------------------------------------------------ */
/* Error handlers                                                     */
/* ------------------------------------------------------------------ */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SpiderDB running at http://localhost:${PORT}`);
});
