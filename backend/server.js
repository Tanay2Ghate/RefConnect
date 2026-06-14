require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Trust Railway / Render proxy ────────────────────────────────────────────
if (isProd) {
  app.set('trust proxy', 1);
}

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: isProd ? (process.env.CORS_ORIGIN || true) : true,
  credentials: true,
}));

// ── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session Store (MySQL — persists across restarts & deploys) ───────────────
const sessionStoreOptions = {
  host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.MYSQLPORT || process.env.DB_PORT  || 3306),
  user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'refconnect',
  clearExpired: true,
  checkExpirationInterval: 900000,   // 15 min
  expiration:              86400000, // 24 hr
  createDatabaseTable: true,         // auto-creates sessions table
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires:    'expires',
      data:       'data',
    },
  },
};

// In production use the MySQL store; locally fall back to memory store
const sessionStore = isProd ? new MySQLStore(sessionStoreOptions) : undefined;

app.use(session({
  secret: process.env.SESSION_SECRET || 'refconnect-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure:   isProd,    // HTTPS only in production
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProd ? 'lax' : false,
  },
}));

// ── Static Files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/profile',      require('./routes/profile'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/connections',  require('./routes/connections'));
app.use('/api/referrals',    require('./routes/referrals'));
app.use('/api/applications', require('./routes/applications'));

// ── SPA Fallback (serve index.html for all non-API routes) ──────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── 404 for unknown API routes ───────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ RefConnect running on http://localhost:${PORT} [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
});

module.exports = app;
