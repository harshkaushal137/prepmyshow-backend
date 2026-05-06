/**
 * ================================================================
 *  emailService.js — Brevo HTTP API Email Service
 *  PrepMyShow x Journey to Smile Cabs
 * ================================================================
 */

const https = require('https');

const sendBookingOTPEmail = async (toEmail, otp, details = {}) => {
  const { userName = '', movieName = '', showDate = '', showTime = '', seats = [] } = details;

  const emailData = JSON.stringify({
    sender: { name: 'PrepMyShow', email: 'sarthaksiii12@gmail.com' },
    to: [{ email: toEmail, name: userName }],
    subject: `Your Booking OTP - ${movieName} | PrepMyShow`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0d0d14;color:#fff;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:24px;color:#fff;">PrepMyShow</h1>
          <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">Your Booking Confirmation OTP</p>
        </div>
        <div style="padding:28px;">
          <p style="color:#94a3b8;font-size:15px;">Hi <strong style="color:#fff;">${userName}</strong>,</p>
          <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin:16px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="color:#64748b;padding:6px 0;">Movie</td><td style="color:#fff;font-weight:bold;">${movieName}</td></tr>
              <tr><td style="color:#64748b;padding:6px 0;">Date</td><td style="color:#fff;">${showDate}</td></tr>
              <tr><td style="color:#64748b;padding:6px 0;">Time</td><td style="color:#fff;">${showTime}</td></tr>
              <tr><td style="color:#64748b;padding:6px 0;">Seats</td><td style="color:#fff;">${Array.isArray(seats) ? seats.join(', ') : seats}</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <p style="color:#94a3b8;font-size:14px;margin-bottom:10px;">Your OTP is:</p>
            <div style="display:inline-block;background:linear-gradient(135deg,#facc15,#f59e0b);color:#000;font-size:36px;font-weight:900;letter-spacing:10px;padding:16px 32px;border-radius:12px;">
              ${otp}
            </div>
            <p style="color:#64748b;font-size:12px;margin-top:10px;">Valid for this booking only.</p>
          </div>
        </div>
        <div style="background:#111118;padding:16px;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">PrepMyShow x Journey to Smile Cabs</p>
        </div>
      </div>
    `
  });

  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS || '';

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(emailData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[emailService] OTP email sent to ' + toEmail);
          resolve({ success: true });
        } else {
          console.error('[emailService] Brevo API error:', res.statusCode, data);
          resolve({ success: false, error: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[emailService] Error:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(emailData);
    req.end();
  });
};

module.exports = { sendBookingOTPEmail };