const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Product, User, Order, Review, recalcRating } = require('../models');
const { wrap } = require('../utils');
const { requireAdmin } = require('../middleware/auth');
  const { notifyStatus } = require('../mailer');

const router = express.Router();
router.use(requireAdmin);                      // is file ka har route sirf admin ke liye

const ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Entryway'];
const STYLES = ['Minimal', 'Boho', 'Modern', 'Traditional'];
const FLOW = ['Placed', 'Packed', 'Shipped', 'Delivered'];
const ALL_STATUS = [...FLOW, 'Cancelled'];

const bad = (res, msg) => res.status(400).json({ error: msg });

/* ---------------- dashboard ---------------- */
router.get('/stats', wrap(async (req, res) => {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const live = { status: { $ne: 'Cancelled' } };
  const sums = { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } };

  const [all] = await Order.aggregate([{ $match: live }, { $group: sums }]);
  const [day] = await Order.aggregate([{ $match: { ...live, createdAt: { $gte: startOfDay } } }, { $group: sums }]);
  const pending = await Order.countDocuments({ status: { $in: ['Placed', 'Packed'] } });
  const customers = await User.countDocuments({ isAdmin: { $ne: true } });
  const lowStock = await Product.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(8).select('id name stock -_id').lean();
  const top = await Order.aggregate([
    { $match: live }, { $unwind: '$items' },
    { $group: { _id: '$items.name', qty: { $sum: '$items.qty' } } },
    { $sort: { qty: -1 } }, { $limit: 5 }
  ]);

  res.json({
    today: { orders: day ? day.orders : 0, revenue: day ? day.revenue : 0 },
    revenue: all ? all.revenue : 0, orders: all ? all.orders : 0,
    pending, customers, lowStock,
    top: top.map(t => ({ name: t._id, qty: t.qty }))
  });
}));

/* ---------------- orders ---------------- */
router.get('/orders', wrap(async (req, res) => {
  const filter = {};
  const st = String(req.query.status || '');
  if (ALL_STATUS.includes(st)) filter.status = st;

  const rows = await Order.find(filter).sort({ orderNo: -1 }).limit(200).populate('userId', 'name email').lean();
  res.json(rows.map(o => ({
    id: o.orderNo, status: o.status, payment: o.paymentMethod, coupon: o.coupon,
    subtotal: o.subtotal, discount: o.discount, delivery: o.delivery, total: o.total,
    created_at: o.createdAt,
    customer: {
      name: o.shipping.name, phone: o.shipping.phone, address: o.shipping.address,
      city: o.shipping.city, state: o.shipping.state, pincode: o.shipping.pincode,
      email: o.userId ? o.userId.email : ''
    },
    items: o.items.map(i => ({ name: i.name, price: i.price, qty: i.qty }))
  })));
}));

// PATCH /api/admin/orders/5/status   body: { status }
router.patch('/orders/:no/status', wrap(async (req, res) => {
  const no = Number(req.params.no);
  const to = String(req.body.status || '');
  const o = Number.isInteger(no) ? await Order.findOne({ orderNo: no }) : null;
  if (!o) return res.status(404).json({ error: 'Order not found' });

  const from = o.status, fi = FLOW.indexOf(from), ti = FLOW.indexOf(to);
  const forward = fi !== -1 && ti === fi + 1;                         // sirf agla step
  const cancel = to === 'Cancelled' && fi !== -1 && from !== 'Delivered';
  if (!forward && !cancel) return bad(res, `Cannot change ${from} to ${to}`);

  // sirf tabhi badlo jab status abhi bhi wahi ho (do baar cancel na ho)
  const r = await Order.updateOne({ _id: o._id, status: from }, { $set: { status: to } });
  if (r.modifiedCount !== 1) return bad(res, 'This order was just changed. Please refresh.');

  if (to === 'Cancelled') {                                           // stock wapas
    await Promise.all(o.items.map(i => Product.updateOne({ id: i.productId }, { $inc: { stock: i.qty } })));
  }
    const owner = await User.findById(o.userId).select('email').lean();
  notifyStatus(o, owner && owner.email, to);
  res.json({ id: o.orderNo, status: to });
}));

/* ---------------- products ---------------- */
const toAdmin = p => ({
  id: p.id, name: p.name, room: p.room, style: p.style, price: p.price,
  discount: p.discount, stock: p.stock, fest: p.fest, emoji: p.emoji, image: p.image,
  description: p.description || '',
  category: p.category || '', material: p.material || '',
  heightCm: p.heightCm == null ? null : p.heightCm
});
const whole = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };
// "brass " aur "BRASS" ek jaisa "Brass" ban jaye, taaki filters me alag-alag option na dikhein
const label = v => String(v || '').trim().replace(/\s+/g, ' ').slice(0, 40).replace(/^./, c => c.toUpperCase());

function readProduct(b) {
  const hRaw = b.heightCm;
  const hasH = !(hRaw === undefined || hRaw === null || hRaw === '');
  const p = {
    name: String(b.name || '').trim().slice(0, 120),
    room: String(b.room || ''), style: String(b.style || ''),
    price: whole(b.price, 1, 1000000),
    discount: whole(b.discount === undefined || b.discount === '' ? 0 : b.discount, 0, 90),
    stock: whole(b.stock === undefined || b.stock === '' ? 0 : b.stock, 0, 100000),
    fest: !!b.fest,
    emoji: String(b.emoji || '').trim().slice(0, 8) || '🏠',
    description: String(b.description || '').trim().slice(0, 1500),
    category: label(b.category),
    material: label(b.material),
    heightCm: hasH ? whole(hRaw, 1, 500) : null
  };
  if (p.name.length < 2) return { error: 'Please enter a product name' };
  if (!ROOMS.includes(p.room)) return { error: 'Choose a room' };
  if (!STYLES.includes(p.style)) return { error: 'Choose a style' };
  if (p.price === null) return { error: 'Enter a valid price in whole rupees' };
  if (p.discount === null) return { error: 'Discount must be between 0 and 90' };
  if (p.stock === null) return { error: 'Enter a valid stock number' };
  if (hasH && p.heightCm === null) return { error: 'Height must be a whole number of cm (1 to 500)' };
  return { p };
}

router.get('/products', wrap(async (req, res) => {
  const rows = await Product.find().sort({ id: 1 }).lean();
  res.json(rows.map(toAdmin));
}));

router.post('/products', wrap(async (req, res) => {
  const { p, error } = readProduct(req.body);
  if (error) return bad(res, error);
  const last = await Product.findOne().sort({ id: -1 }).select('id').lean();
  const id = (last ? last.id : 0) + 1;
  const doc = await Product.create({ ...p, id, c1: '#f3e8cf', c2: '#e2cc9c', image: 'images/products/p' + id + '.jpg' });
  res.status(201).json(toAdmin(doc.toObject()));
}));

router.put('/products/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { p, error } = readProduct(req.body);
  if (error) return bad(res, error);
  const doc = Number.isInteger(id) ? await Product.findOneAndUpdate({ id }, { $set: p }, { new: true }).lean() : null;
  if (!doc) return res.status(404).json({ error: 'Product not found' });
  res.json(toAdmin(doc));
}));

router.delete('/products/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const r = Number.isInteger(id) ? await Product.deleteOne({ id }) : { deletedCount: 0 };
  if (!r.deletedCount) return res.status(404).json({ error: 'Product not found' });
  res.json({ ok: true });
}));

/* ---------------- photo upload ---------------- */
const IMG_DIR = path.join(__dirname, '..', '..', 'frontend', 'images', 'products');
fs.mkdirSync(IMG_DIR, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMG_DIR),
    // file ka naam hum khud banate hain, user ka diya hua naam kabhi use nahi karte
    filename: (req, file, cb) => cb(null, `p${Number(req.params.id)}-${Date.now()}${EXT[file.mimetype]}`)
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => EXT[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG or WEBP photos are allowed'))
});

router.post('/products/:id/image', (req, res, next) => {
  upload.single('photo')(req, res, err => {
    if (err) return bad(res, err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be under 3 MB' : err.message);
    next();
  });
}, wrap(async (req, res) => {
  if (!req.file) return bad(res, 'Please choose a photo');
  const id = Number(req.params.id);
  const doc = Number.isInteger(id)
    ? await Product.findOneAndUpdate({ id }, { $set: { image: 'images/products/' + req.file.filename } }, { new: true }).lean()
    : null;
  if (!doc) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'Product not found' }); }
  res.json(toAdmin(doc));
}));
/* ---------------- reviews ---------------- */
const idOk = id => /^[a-f0-9]{24}$/i.test(String(id));

router.get('/reviews', wrap(async (req, res) => {
  const rows = await Review.find().sort({ createdAt: -1 }).limit(150).populate('userId', 'email').lean();
  const prods = await Product.find({ id: { $in: [...new Set(rows.map(r => r.productId))] } }).select('id name').lean();
  const names = Object.fromEntries(prods.map(p => [p.id, p.name]));
  res.json(rows.map(r => ({
    id: String(r._id), product: names[r.productId] || ('#' + r.productId), rating: r.rating,
    title: r.title, text: r.text, name: r.userName, email: r.userId ? r.userId.email : '',
    status: r.status, created_at: r.createdAt
  })));
}));

// PATCH /api/admin/reviews/<id>   body: { status: 'hidden' | 'published' }
router.patch('/reviews/:id', wrap(async (req, res) => {
  const status = String(req.body.status || '');
  if (!idOk(req.params.id) || !['published', 'hidden'].includes(status)) return bad(res, 'Invalid request');
  const r = await Review.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!r) return res.status(404).json({ error: 'Review not found' });
  await recalcRating(r.productId);
  res.json({ ok: true });
}));

router.delete('/reviews/:id', wrap(async (req, res) => {
  if (!idOk(req.params.id)) return bad(res, 'Invalid request');
  const r = await Review.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ error: 'Review not found' });
  await recalcRating(r.productId);
  res.json({ ok: true });
}));

module.exports = router;