const { dbRun, uuidv4 } = require('../config/database');
const logAudit = async ({ userId, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent, metadata }) => {
  try {
    await dbRun(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, [uuidv4(), userId || null, action, entityType || null, entityId || null, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, ipAddress || null, userAgent || null, metadata ? JSON.stringify(metadata) : null]);
  } catch (err) { console.error('Audit log failed:', err.message); }
};
module.exports = { logAudit };
