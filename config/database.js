const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'alexadb.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('DB connection failed:', err.message); process.exit(1); }
  console.log('Connected to SQLite.');
});
db.serialize(() => { db.run('PRAGMA foreign_keys = ON'); db.run('PRAGMA journal_mode = WAL'); });

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes }); });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => { err ? reject(err) : resolve(row); });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { err ? reject(err) : resolve(rows); });
});

const initSchema = async () => {
  const tables = [
    // Users
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT, email_verified INTEGER DEFAULT 0, email_verified_at TEXT, role TEXT DEFAULT 'user' CHECK(role IN ('super_admin','admin','moderator','premium_user','user')), status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended','banned')), two_factor_enabled INTEGER DEFAULT 0, two_factor_secret TEXT, last_login_at TEXT, last_login_ip TEXT, failed_login_attempts INTEGER DEFAULT 0, locked_until TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, avatar_url TEXT)`,
    // User Profiles
    `CREATE TABLE IF NOT EXISTS user_profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, first_name TEXT, last_name TEXT, display_name TEXT, bio TEXT, phone TEXT, company TEXT, job_title TEXT, website TEXT, location TEXT, timezone TEXT DEFAULT 'UTC', language TEXT DEFAULT 'en', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Sessions
    `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL, refresh_token TEXT UNIQUE NOT NULL, device_fingerprint TEXT, ip_address TEXT, user_agent TEXT, device_info TEXT, location TEXT, expires_at TEXT NOT NULL, refresh_expires_at TEXT NOT NULL, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Refresh Tokens
    `CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, session_id TEXT, device_fingerprint TEXT, ip_address TEXT, expires_at TEXT NOT NULL, revoked_at TEXT, replaced_by_token TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE)`,
    // Email Verification Tokens
    `CREATE TABLE IF NOT EXISTS email_verification_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // OTP Codes
    `CREATE TABLE IF NOT EXISTS otp_codes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, otp_hash TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, attempts INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Password Reset Tokens
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, ip_address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // OAuth Accounts
    `CREATE TABLE IF NOT EXISTS oauth_accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, provider_account_id TEXT NOT NULL, provider_email TEXT, provider_data TEXT, access_token TEXT, refresh_token TEXT, expires_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider, provider_account_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // User Preferences
    `CREATE TABLE IF NOT EXISTS user_preferences (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, theme TEXT DEFAULT 'dark' CHECK(theme IN ('light','dark','system')), email_notifications INTEGER DEFAULT 1, login_alerts INTEGER DEFAULT 1, security_alerts INTEGER DEFAULT 1, marketing_emails INTEGER DEFAULT 0, profile_visibility TEXT DEFAULT 'public' CHECK(profile_visibility IN ('public','friends','private')), data_sharing INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Login History
    `CREATE TABLE IF NOT EXISTS login_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT, ip_address TEXT, user_agent TEXT, device_info TEXT, location TEXT, status TEXT CHECK(status IN ('success','failed','blocked')), failure_reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Audit Logs
    `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, old_value TEXT, new_value TEXT, ip_address TEXT, user_agent TEXT, metadata TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    // Notifications
    `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, data TEXT, read_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Magic Login Tokens
    `CREATE TABLE IF NOT EXISTS magic_login_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, ip_address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Databases (enhanced)
    `CREATE TABLE IF NOT EXISTS databases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT CHECK(type IN ('postgresql','mysql','mongodb','redis','sqlite','mariadb')), status TEXT DEFAULT 'pending' CHECK(status IN ('pending','building','active','paused','failed','deleted')), connection_string TEXT, host TEXT, port INTEGER, username TEXT, password TEXT, database_name TEXT, size_mb INTEGER DEFAULT 0, storage_used_mb INTEGER DEFAULT 0, queries_count INTEGER DEFAULT 0, last_accessed_at TEXT, engine_version TEXT, region TEXT DEFAULT 'us-east-1', plan TEXT DEFAULT 'free' CHECK(plan IN ('free','starter','pro','enterprise')), created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // API Keys
    `CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, key_hash TEXT UNIQUE NOT NULL, key_prefix TEXT, scopes TEXT DEFAULT 'read', last_used_at TEXT, expires_at TEXT, revoked_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Buckets (Storage)
    `CREATE TABLE IF NOT EXISTS buckets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT DEFAULT 's3' CHECK(type IN ('s3','gcs','azure')), status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','deleted')), endpoint TEXT, region TEXT DEFAULT 'us-east-1', size_mb INTEGER DEFAULT 0, file_count INTEGER DEFAULT 0, public_access INTEGER DEFAULT 0, cors_enabled INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Backups
    `CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, database_id TEXT, bucket_id TEXT, name TEXT NOT NULL, type TEXT CHECK(type IN ('auto','manual')), status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')), size_mb INTEGER DEFAULT 0, download_url TEXT, expires_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE SET NULL, FOREIGN KEY (bucket_id) REFERENCES buckets(id) ON DELETE SET NULL)`,
    // Migrations
    `CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, source_type TEXT CHECK(source_type IN ('postgresql','mysql','mongodb','sqlite','csv','json')), target_type TEXT CHECK(target_type IN ('postgresql','mysql','mongodb')), status TEXT DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed')), progress INTEGER DEFAULT 0, records_processed INTEGER DEFAULT 0, records_total INTEGER DEFAULT 0, error_message TEXT, started_at TEXT, completed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    // Database Connections (for editor)
    `CREATE TABLE IF NOT EXISTS database_connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, database_id TEXT NOT NULL, connection_name TEXT NOT NULL, is_default INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE)`
  ];

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token)',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)',
    'CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_account_id)',
    'CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_databases_user ON databases(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_databases_status ON databases(status)',
    'CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_magic_login_user ON magic_login_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON otp_codes(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_buckets_user ON buckets(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_migrations_user ON migrations(user_id)'
  ];

  for (const sql of tables) await dbRun(sql);
  for (const sql of indexes) await dbRun(sql);
  console.log('Database schema initialized.');
};

module.exports = { db, dbRun, dbGet, dbAll, initSchema, uuidv4 };
