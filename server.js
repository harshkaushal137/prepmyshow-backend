/**
 * ================================================================
 *  server.js  — Express App Entry Point
 *  PrepMyShow × Journey to Smile Cabs
 * ================================================================
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');

const movieRoutes = require('./moviecontroller');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── MongoDB Connect ──────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/movies', movieRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'PrepMyShow AI Movie API' }));

app.use((_req, res) => res.status(404).json({ status: 'error', message: 'Route not found.' }));

app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ status: 'error', message: 'Internal server error.' });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎬 PrepMyShow API running on http://localhost:${PORT}`);
  console.log(`   Health   : http://localhost:${PORT}/health`);
  console.log(`   Bookings : GET http://localhost:${PORT}/api/movies/bookings/all\n`);
});

module.exports = app;