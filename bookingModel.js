/**
 * ================================================================
 *  bookingModel.js — MongoDB Booking Schema
 *  PrepMyShow × Journey to Smile Cabs
 * ================================================================
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // ── User Info ──────────────────────────────────────────────────
  userName  : { type: String, required: true, trim: true },
  
  userEmail : { type: String, required: true, trim: true },

  // ── Movie Info ─────────────────────────────────────────────────
  movieName : { type: String, required: true, trim: true },
  tmdbId    : { type: Number, default: null },

  // ── Show Info ──────────────────────────────────────────────────
  showDate  : { type: String, required: true },   // e.g. "2025-08-15"
  showTime  : { type: String, required: true },   // e.g. "7:30 PM"

  // ── Seat Info ─────────────────────────────────────────────────
  seats     : { type: [String], required: true }, // e.g. ["A1", "A2"]

  // ── OTP Verification ──────────────────────────────────────────
  otp           : { type: String,  required: true },
  otpVerified   : { type: Boolean, default: false },

  // ── Booking Status ────────────────────────────────────────────
  status    : {
    type    : String,
    enum    : ['pending', 'confirmed', 'cancelled'],
    default : 'pending',
  },

  // ── Timestamps ────────────────────────────────────────────────
  bookedAt  : { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);