/**
 * ================================================================
 *  emailService.js — Nodemailer Email OTP Service
 *  PrepMyShow × Journey to Smile Cabs
 * ================================================================
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:'smtp.gmail.com',port:587,secure:false,
  auth    : {
    user : process.env.EMAIL_USER,
    pass : process.env.EMAIL_PASS,
  },
});

/**
 * @param {string} toEmail   — User ka email address
 * @param {string} otp       — 4-digit OTP
 * @param {object} details   — { userName, movieName, showDate, showTime, seats }
 */
const sendBookingOTPEmail = async (toEmail, otp, details = {}) => {
  const { userName = '', movieName = '', showDate = '', showTime = '', seats = [] } = details;

  const mailOptions = {
    from    : `"PrepMyShow 🎬" <${process.env.EMAIL_USER}>`,
    to      : toEmail,
    subject : `Your Booking OTP - ${movieName} | PrepMyShow`,
    html    : `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0d0d14; color: #fff; border-radius: 16px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #fff;">🎬 PrepMyShow</h1>
          <p style="margin: 6px 0 0; color: #c4b5fd; font-size: 14px;">Your Booking Confirmation OTP</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <p style="color: #94a3b8; font-size: 15px;">Hi <strong style="color: #fff;">${userName}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px;">Your booking details are:</p>

          <!-- Booking Details -->
          <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="color: #64748b; padding: 6px 0;">🎥 Movie</td>   <td style="color: #fff; font-weight: bold;">${movieName}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">📅 Date</td>    <td style="color: #fff;">${showDate}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">🕐 Time</td>    <td style="color: #fff;">${showTime}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">💺 Seats</td>   <td style="color: #fff;">${Array.isArray(seats) ? seats.join(', ') : seats}</td></tr>
            </table>
          </div>

          <!-- OTP Box -->
          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 10px;">Your OTP is:</p>
            <div style="display: inline-block; background: linear-gradient(135deg, #facc15, #f59e0b); color: #000; font-size: 36px; font-weight: 900; letter-spacing: 10px; padding: 16px 32px; border-radius: 12px;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Valid for this booking only. Do not share with anyone.</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #111118; padding: 16px; text-align: center;">
          <p style="color: #475569; font-size: 12px; margin: 0;">PrepMyShow × Journey to Smile Cabs</p>
          <p style="color: #334155; font-size: 11px; margin: 4px 0 0;">Agar aapne yeh booking nahi ki toh is email ko ignore karein.</p>
        </div>

      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[emailService] OTP email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error('[emailService] Error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendBookingOTPEmail };