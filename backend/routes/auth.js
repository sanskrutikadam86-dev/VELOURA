const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Otp } = require('../models');
const { wrap } = require('../utils');
const { requireAuth, SECRET } = require('../middleware/auth');
const { sendOtp, configured } = require('../mailer');

const router = express.Router();

const emailOk = e => /^\S+@\S+\.\S+$/.test(e) && e.length <= 190;
const makeToken = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });
const publicUser = u => ({ id: String(u._id), name: u.name, email: u.email });

const OTP_MINUTES = 10, MAX_TRIES = 5, RESEND_SECONDS = 60;
const hashCode = (email, code) => crypto.createHmac('sha256', SECRET).update(email + ':' + code).digest('hex');
const sameHash = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/* ---------- OTP: code mangwana ---------- */
// POST /api/auth/otp/request   body: { email }
router.post('/otp/request', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address' });

  // 60 second se pehle dobara nahi
  const last = await Otp.findOne({ email }).lean();
  if (last) {
    const wait = RESEND_SECONDS - Math.floor((Date.now() - last.createdAt.getTime()) / 1000);
    if (wait > 0) return res.status(429).json({ error: `Please wait ${wait} seconds before asking for a new code` });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Otp.findOneAndUpdate(
    { email },
    { $set: { codeHash: hashCode(email, code), attempts: 0, createdAt: new Date(), expiresAt: new Date(Date.now() + OTP_MINUTES * 60 * 1000) } },
    { upsert: true }
  );

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      await Otp.deleteOne({ email });
      return res.status(503).json({ error: 'Email service is not set up yet' });
    }
    console.log(`[DEV] ${email} ka login code: ${code}`);     // email set nahi ho to testing ke liye terminal me
  } else {
    try {
      await sendOtp(email, code);
    } catch (e) {
      console.error('OTP email nahi gaya:', e.message);
      await Otp.deleteOne({ email });
      return res.status(502).json({ error: 'We could not send the email. Please try again.' });
    }
  }
  res.json({ ok: true, resendIn: RESEND_SECONDS });
}));

/* ---------- OTP: code check karke login ---------- */
// POST /api/auth/otp/verify   body: { email, code, name? }
router.post('/otp/verify', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').replace(/\D/g, '');
  if (!emailOk(email) || code.length !== 6) return res.status(400).json({ error: 'Enter the 6-digit code' });

  // Har koshish pehle ginte hain, taaki koi ek saath bahut saare guess na laga sake
  const rec = await Otp.findOneAndUpdate({ email, expiresAt: { $gt: new Date() } }, { $inc: { attempts: 1 } }, { new: true });
  if (!rec) return res.status(400).json({ error: 'This code has expired. Please ask for a new one.' });
  if (rec.attempts > MAX_TRIES) return res.status(429).json({ error: 'Too many wrong attempts. Please ask for a new code.' });

  if (!sameHash(hashCode(email, code), rec.codeHash)) {
    const left = MAX_TRIES - rec.attempts;
    return res.status(400).json({ error: left > 0 ? `Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Incorrect code. Please ask for a new one.' });
  }

  let u = await User.findOne({ email });
  if (!u) {
    const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (name.length < 2) return res.json({ needName: true });      // code sahi hai, bas naam chahiye
    try { u = await User.create({ name, email }); }
    catch (e) { if (e.code === 11000) u = await User.findOne({ email }); else throw e; }
  }

  await Otp.deleteOne({ _id: rec._id });                           // code ek hi baar chalta hai
  const user = publicUser(u);
  res.json({ token: makeToken(user), user });
}));

/* ---------- Admin ke liye password login ---------- */
// POST /api/auth/login   body: { email, password }
router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const u = await User.findOne({ email }).lean();
  // Email galat ho, password galat ho, ya account me password hi na ho: message ek hi
  if (!u || !u.passwordHash || !(await bcrypt.compare(password, u.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: makeToken({ id: String(u._id) }), user: publicUser(u) });
}));

// GET /api/auth/me   (header: Authorization: Bearer <token>)
router.get('/me', requireAuth, wrap(async (req, res) => {
  const u = await User.findById(req.userId).lean();
  if (!u) return res.status(401).json({ error: 'Account not found' });
  res.json({ user: publicUser(u) });
}));

module.exports = router;