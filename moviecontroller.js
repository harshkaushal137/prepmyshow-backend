const express = require('express');
const router  = express.Router();
const { moderateQuery, semanticSearch, analyzeMovieMood } = require('./aiServices');
const { searchMovie, getMovieDetails }                    = require('./tmdbService');
const { sendBookingOTPEmail }                             = require('./emailService');
const Booking                                             = require('./bookingModel');
const searchCounts = new Map();
function isRateLimited(ip) {
  const now = Date.now(), window = 60_000, limit = 20;
  const entry = searchCounts.get(ip) || { count: 0, resetAt: now + window };
  if (now > entry.resetAt) { searchCounts.set(ip, { count: 1, resetAt: now + window }); return false; }
  entry.count++; searchCounts.set(ip, entry); return entry.count > limit;
}
router.post('/search', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const query = (req.body?.query || '').toString().trim();
  if (!query) return res.status(400).json({ status: 'error', message: 'Please enter a search term.' });
  if (query.length > 300) return res.status(400).json({ status: 'error', message: 'Query too long.' });
  if (isRateLimited(ip)) return res.status(429).json({ status: 'error', message: 'Too many searches.' });
  try {
    const moderation = await moderateQuery(query);
    if (!moderation.safe) return res.status(200).json({ status: 'blocked', results: [] });
    const semantic = await semanticSearch(query);
    let results = await searchMovie(semantic.title, semantic.year, 6);
    if (results.length === 0 && semantic.alternates?.length > 0) results = await searchMovie(semantic.alternates[0].title, semantic.alternates[0].year, 6);
    return res.status(200).json({ status: 'success', query: { original: query, interpreted: semantic.title, year: semantic.year, confidence: semantic.confidence, reasoning: semantic.reasoning, alternates: semantic.alternates || [] }, count: results.length, results });
  } catch (err) { return res.status(500).json({ status: 'error', message: 'Something went wrong.' }); }
});
router.post('/mood', async (req, res) => {
  const { title, overview } = req.body || {};
  if (!title) return res.status(400).json({ status: 'error', message: 'Movie title is required.' });
  try { const mood = await analyzeMovieMood(title, overview || ''); return res.status(200).json({ status: 'success', mood }); }
  catch (err) { return res.status(500).json({ status: 'error', message: 'Mood analysis failed.' }); }
});
router.post('/confirm-booking', async (req, res) => {
  const { userName, userEmail, movieName, tmdbId, showDate, showTime, seats } = req.body || {};
  if (!userName || !userEmail || !movieName || !showDate || !showTime || !seats)
    return res.status(400).json({ status: 'error', message: 'Sabhi fields required hain: userName, userEmail, movieName, showDate, showTime, seats' });
  if (!Array.isArray(seats) || seats.length === 0)
    return res.status(400).json({ status: 'error', message: 'Seats empty nahi hone chahiye.' });
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  try {
    const booking = await Booking.create({ userName, userEmail, movieName, tmdbId: tmdbId || null, showDate, showTime, seats, otp, otpVerified: false, status: 'pending' });
    const emailResult = await sendBookingOTPEmail(userEmail, otp, { userName, movieName, showDate, showTime, seats });
    if (!emailResult.success) { await Booking.findByIdAndDelete(booking._id); return res.status(500).json({ status: 'error', message: 'OTP email send nahi hua.' }); }
    return res.status(200).json({ status: 'success', message: `OTP ${userEmail} par bhej diya gaya!`, bookingId: booking._id });
  } catch (err) { console.error('[confirm-booking]', err); return res.status(500).json({ status: 'error', message: 'Booking mein kuch gadbad hui.' }); }
});
router.post('/verify-otp', async (req, res) => {
  const { bookingId, otp } = req.body || {};
  if (!bookingId || !otp) return res.status(400).json({ status: 'error', message: 'bookingId aur otp required hain.' });
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ status: 'error', message: 'Booking nahi mili.' });
    if (booking.otpVerified) return res.status(200).json({ status: 'success', message: 'Pehle se confirm hai!', booking });
    if (booking.otp !== otp.toString()) return res.status(400).json({ status: 'error', message: 'OTP galat hai.' });
    booking.otpVerified = true; booking.status = 'confirmed'; await booking.save();
    return res.status(200).json({ status: 'success', message: '✅ Booking confirm ho gayi!', booking: { id: booking._id, userName: booking.userName, userEmail: booking.userEmail, movieName: booking.movieName, showDate: booking.showDate, showTime: booking.showTime, seats: booking.seats, status: booking.status, bookedAt: booking.bookedAt } });
  } catch (err) { return res.status(500).json({ status: 'error', message: 'OTP verify nahi ho saka.' }); }
});
router.get('/bookings/all', async (req, res) => {
  try { const bookings = await Booking.find({}).sort({ bookedAt: -1 }); return res.status(200).json({ status: 'success', count: bookings.length, bookings }); }
  catch (err) { return res.status(500).json({ status: 'error', message: 'Bookings fetch nahi ho sakeen.' }); }
});
router.get('/:tmdbId', async (req, res) => {
  const tmdbId = parseInt(req.params.tmdbId);
  if (isNaN(tmdbId)) return res.status(400).json({ status: 'error', message: 'Invalid movie ID.' });
  try { const details = await getMovieDetails(tmdbId); return res.status(200).json({ status: 'success', movie: details }); }
  catch (err) { return res.status(500).json({ status: 'error', message: err.message || 'Could not fetch movie details.' }); }
});
module.exports = router;
