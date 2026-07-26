require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const passport = require('./config/passport');
const { initSchema } = require('./config/database');
const { verifyConnection } = require('./config/mailer');
const securityMiddleware = require('./middleware/security');
const { standardLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();

initSchema().catch(err => { console.error('DB init failed:', err); process.exit(1); });
verifyConnection();

securityMiddleware.forEach(mw => app.use(mw));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(passport.initialize());
app.use('/api/', standardLimiter);
app.use('/api/auth/', apiLimiter);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

const spaRoutes = ['/', '/login', '/register', '/dashboard', '/profile', '/settings', '/admin', '/verify-email', '/reset-password', '/forgot-password', '/magic-login'];
spaRoutes.forEach(route => {
  app.get(route, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err.message === 'Only image files are allowed.') return res.status(400).json({ success: false, message: err.message });
  res.status(err.status || 500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message });
});

app.use((req, res) => { res.status(404).json({ success: false, message: 'Resource not found.' }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AlexaDB running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
