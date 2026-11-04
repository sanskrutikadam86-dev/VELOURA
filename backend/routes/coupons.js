const express = require('express');
const { wrap } = require('../utils');
const { priceCart, checkCoupon } = require('../cart');

const router = express.Router();

// POST /api/coupons/validate   body: { code, items: [{ id, qty }] }
router.post('/validate', wrap(async (req, res) => {
  const { subtotal } = await priceCart(req.body.items);
  const r = checkCoupon(req.body.code, subtotal);
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, code: r.code, subtotal, discount: r.discount, total: subtotal - r.discount });
}));

module.exports = router;