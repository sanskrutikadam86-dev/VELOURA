const jwt = require('jsonwebtoken');
const { User } = require('../models');

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error('JWT_SECRET nahi mila ya bahut chhota hai (kam se kam 32 akshar). backend/.env check kar.');
  process.exit(1);
}

// Jis route pe login zaruri ho, wahan ye lagayenge
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.userId = jwt.verify(token, SECRET).id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// Admin routes ke liye: login bhi chahiye aur database me isAdmin bhi true ho
function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const u = await User.findById(req.userId).select('isAdmin').lean();
      if (!u || !u.isAdmin) return res.status(403).json({ error: 'This account is not an admin' });
      next();
    } catch (e) { next(e); }
  });
}

module.exports = { requireAuth, requireAdmin, SECRET };