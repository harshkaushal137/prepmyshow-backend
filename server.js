/**
 * ================================================================
 *  server.js  — Express App Entry Point
 *  PrepMyShow × Journey to Smile Cabs
 * ================================================================
 */

require('dotenv').config();

// Fallback hardcoded values agar Railway env vars na mile
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://harshkaushal137_db_user:cSOKfDJpdwKJUBuw@cluster0.jkysra4.mongodb.net/PrepMyShow?appName=Cluster0';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB9MbZpUELy6wtmVvcWUupCT2ibuS05PZ0';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'sarthaksiii12@gmail.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'mwxr bvvq sgbe okbo';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC79c2e064915d9ef62b5a3ab7793f4ed3';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'e60b1a0153952f7516b3f7c418a41252';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15077135894';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://next-gen-ticket-booking.vercel.app';
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