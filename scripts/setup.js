const { initSchema } = require('../config/database');
const setup = async () => {
  console.log('Setting up AlexaDB...');
  try { await initSchema(); console.log('Done. Run npm start.'); process.exit(0); }
  catch (err) { console.error('Setup failed:', err); process.exit(1); }
};
setup();
