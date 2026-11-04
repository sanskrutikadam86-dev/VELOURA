const express = require('express');
const { Product, User, Order, Review, recalcRating } = require('../models');
const { wrap } = require('../utils');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const pidOf = req => { const n = Number(req.params.productId); return Number.isInteger(n) ? n : null; };
const bad = (res, msg) => res.status(400).json({ error: msg });
const shortName = full => {
  const p = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Customer';
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0];
};
// kya is user ko ye product mil chuka hai (koi order Delivered hai)?
const gotIt = (userId, pid) => Order.exists({ userId, status: 'Delivered', 'items.productId': pid });

// GET /api/reviews/5?sort=recent|high|low&page=1   (sabke liye khula)
router.get('/:productId', wrap(async (req, res) => {
  const pid = pidOf(req);
  if (pid === null) return res.status(404).json({ error: 'Product not found' });

  const PER = 8, page = Math.max(1, Number(req.query.page) || 1);
  const sort = { recent: { createdAt: -1 }, high: { rating: -1, createdAt: -1 }, low: { rating: 1, createdAt: -1 } }[String(req.query.sort)] || { createdAt: -1 };
  const filter = { productId: pid, status: 'published' };

  const [rows, total, dist] = await Promise.all([
    Review.find(filter).sort(sort).skip((page - 1) * PER).limit(PER).lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', n: { $sum: 1 } } }])
  ]);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  dist.forEach(d => { counts[d._id] = d.n; sum += d._id * d.n; });

  res.json({
    summary: { count: total, avg: total ? Number((sum / total).toFixed(1)) : 0, counts },
    reviews: rows.map(r => ({ name: r.userName, rating: r.rating, title: r.title, text: r.text, verified: r.verified, date: r.createdAt })),
    hasMore: page * PER < total
  });
}));

// GET /api/reviews/5/mine   (login chahiye): review likh sakta hai ya nahi, aur purana review
router.get('/:productId/mine', requireAuth, wrap(async (req, res) => {
  const pid = pidOf(req);
  if (pid === null) return res.status(404).json({ error: 'Product not found' });
  const [delivered, mine] = await Promise.all([
    gotIt(req.userId, pid),
    Review.findOne({ productId: pid, userId: req.userId }).lean()
  ]);
  res.json({ canReview: !!delivered, review: mine ? { rating: mine.rating, title: mine.title, text: mine.text } : null });
}));

// POST /api/reviews/5   body: { rating, title, text }   (naya ya badla hua review)
router.post('/:productId', requireAuth, wrap(async (req, res) => {
  const pid = pidOf(req);
  const product = pid === null ? null : await Product.findOne({ id: pid }).select('id').lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const rating = Number(req.body.rating);
  const title = String(req.body.title || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const text = String(req.body.text || '').trim().slice(0, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, 'Please choose a star rating');
  if (text.length < 10) return bad(res, 'Please write at least 10 characters');

  if (!(await gotIt(req.userId, pid))) {
    return res.status(403).json({ error: 'Only customers who have received this product can review it.' });
  }

  const u = await User.findById(req.userId).select('name').lean();
  // status yahan nahi chhedte: admin ne hide kiya ho to badalne se wapas nahi dikhega
  await Review.findOneAndUpdate(
    { productId: pid, userId: req.userId },
    { $set: { rating, title, text, userName: shortName(u && u.name), verified: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await recalcRating(pid);
  res.json({ ok: true });
}));

// DELETE /api/reviews/5   (apna review hatana)
router.delete('/:productId', requireAuth, wrap(async (req, res) => {
  const pid = pidOf(req);
  if (pid === null) return res.status(404).json({ error: 'Product not found' });
  await Review.deleteOne({ productId: pid, userId: req.userId });
  await recalcRating(pid);
  res.json({ ok: true });
}));

module.exports = router;