/**
 * ================================================================
 *  otpService.js — Twilio SMS Service
 *  PrepMyShow × Journey to Smile Cabs
 * ================================================================
 */

const twilio = require('twilio');

/**
 * @param {string} userPhone  — e.g. "+919876543210"
 * @param {string} otp        — 4-digit OTP
 * @param {object} details    — { userName, movieName, showDate, showTime, seats }
 */
const sendBookingOTP = async (userPhone, otp, details = {}) => {
  const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const { userName = '', movieName = '', showDate = '', showTime = '', seats = [] } = details;

  const smsBody = [
    `🎬 PrepMyShow - Booking OTP`,
    ``,
    `Naam    : ${userName}`,
    `Movie   : ${movieName}`,
    `Date    : ${showDate}`,
    `Time    : ${showTime}`,
    `Seats   : ${Array.isArray(seats) ? seats.join(', ') : seats}`,
    ``,
    `Your OTP: ${otp}`,
    `Valid for this booking only.`,
  ].join('\n');

  try {
    await client.messages.create({
      body : smsBody,
      from : process.env.TWILIO_PHONE_NUMBER,
      to   : userPhone,
    });
    return { success: true };
  } catch (error) {
    console.error('[otpService] Twilio Error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendBookingOTP };