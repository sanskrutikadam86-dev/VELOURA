const express = require('express');
const { Product } = require('../models');
const { salePrice, wrap } = require('../utils');

const router = express.Router();

const toApi = p => ({
  id: p.id, name: p.name, room: p.room, style: p.style, price: p.price, off: p.discount,
  emoji: p.emoji, c1: p.c1, c2: p.c2, fest: p.fest, stock: p.stock, image: p.image,  description: p.description || '',   ratingAvg: Number((p.ratingAvg || 0).toFixed(1)),
  ratingCount: p.ratingCount || 0, category: p.category || '',
  material: p.material || '',
  heightCm: p.heightCm == null ? null : p.heightCm,
  salePrice: salePrice({ price: p.price, off: p.discount })
});
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products?room=Bedroom&style=Boho&maxPrice=2999&festive=1&q=lamp
router.get('/', wrap(async (req, res) => {
  const { room, style, maxPrice, festive, q } = req.query;
  const filter = {};
  // String(...) isliye, taaki koi object bhej ke query me gadbad na kar sake
  if (room)  filter.room = String(room);
  if (style) filter.style = String(style);
  if (festive === '1') filter.fest = true;
  if (q) filter.name = new RegExp(escapeRe(String(q)), 'i');

  const rows = await Product.find(filter).sort({ id: 1 }).lean();
  let list = rows.map(toApi);
  if (maxPrice) list = list.filter(p => p.salePrice <= Number(maxPrice));
  res.json(list);
}));

// GET /api/products/5
router.get('/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const p = Number.isInteger(id) ? await Product.findOne({ id }).lean() : null;
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(toApi(p));
}));

module.exports = router;