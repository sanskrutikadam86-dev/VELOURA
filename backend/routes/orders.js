const express = require('express');
  const { Product, Order, User, nextSeq } = require('../models');
  const { notifyNewOrder } = require('../mailer');
const { wrap } = require('../utils');
const { requireAuth } = require('../middleware/auth');
const { priceCart, checkCoupon, deliveryFor } = require('../cart');

const router = express.Router();
router.use(requireAuth);                       // order ke liye login zaruri hai

const bad = (res, msg) => res.status(400).json({ error: msg });
const clean = (v, max) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, max);

const toApi = o => ({
  id: o.orderNo, status: o.status, payment: o.paymentMethod,
  name: o.shipping.name, city: o.shipping.city, pincode: o.shipping.pincode,
  subtotal: o.subtotal, discount: o.discount, delivery: o.delivery, total: o.total,
  coupon: o.coupon, created_at: o.createdAt,
  items: o.items.map(i => ({ product_id: i.productId, name: i.name, price: i.price, qty: i.qty }))
});

// POST /api/orders   body: { items, coupon, shipping, payment }
router.post('/', wrap(async (req, res) => {
  const s = req.body.shipping || {};
  const ship = {
    name: clean(s.name, 80), phone: clean(s.phone, 10), address: clean(s.address, 200),
    city: clean(s.city, 60), state: clean(s.state, 60), pincode: clean(s.pincode, 6)
  };
  if (ship.name.length < 2)                 return bad(res, 'Please enter your name');
  if (!/^[6-9]\d{9}$/.test(ship.phone))     return bad(res, 'Enter a valid 10-digit mobile number');
  if (ship.address.length < 6)              return bad(res, 'Please enter your full address');
  if (ship.city.length < 2 || ship.state.length < 2) return bad(res, 'Please enter city and state');
  if (!/^[1-9]\d{5}$/.test(ship.pincode))   return bad(res, 'Enter a valid 6-digit pincode');
  if (req.body.payment !== 'COD')           return bad(res, 'Only cash on delivery is available right now');

  // price, naam, stock sab server ke database se
  const { items, subtotal } = await priceCart(req.body.items);
  if (!items.length) return bad(res, 'Your cart is empty');
  for (const i of items) {
    if (i.qty > i.stock) return bad(res, i.stock > 0 ? `Only ${i.stock} left of ${i.name}` : `${i.name} is out of stock`);
  }

  let discount = 0, couponCode = null;
  if (req.body.coupon) {
    const c = checkCoupon(req.body.coupon, subtotal);
    if (!c.ok) return bad(res, c.error);
    discount = c.discount; couponCode = c.code;
  }
  const delivery = deliveryFor(subtotal);
  const total = subtotal - discount + delivery;

  // Stock ek-ek karke kam hota hai (sirf tabhi jab bacha ho). Kuch bhi fail ho to wapas badha dete hain.
  const taken = [];
  let orderNo;
  try {
    for (const i of items) {
      const r = await Product.updateOne({ id: i.id, stock: { $gte: i.qty } }, { $inc: { stock: -i.qty } });
      if (r.modifiedCount !== 1) throw new Error('STOCK:' + i.name);
      taken.push(i);
    }
    orderNo = await nextSeq('orders');
    await Order.create({
      orderNo, userId: req.userId, paymentMethod: 'COD', shipping: ship,
      items: items.map(i => ({ productId: i.id, name: i.name, price: i.price, qty: i.qty })),
      subtotal, discount, delivery, total, coupon: couponCode
    });
  } catch (e) {
    await Promise.all(taken.map(i => Product.updateOne({ id: i.id }, { $inc: { stock: i.qty } })));
    if (String(e.message).startsWith('STOCK:')) return bad(res, `${e.message.slice(6)} just went out of stock`);
    throw e;
  }
    // email peeche chalta hai, customer ko wait nahi karna padta
  const me = await User.findById(req.userId).select('email').lean();
  notifyNewOrder({ orderNo, items, subtotal, discount, delivery, total, coupon: couponCode, shipping: ship }, me && me.email);

  res.status(201).json({ id: orderNo, status: 'Placed', subtotal, discount, delivery, total });
}));

// GET /api/orders   (sirf logged-in user ke apne orders)
router.get('/', wrap(async (req, res) => {
  const rows = await Order.find({ userId: req.userId }).sort({ orderNo: -1 }).lean();
  res.json(rows.map(toApi));
}));

// GET /api/orders/5
router.get('/:id', wrap(async (req, res) => {
  const no = Number(req.params.id);
  const o = Number.isInteger(no) ? await Order.findOne({ orderNo: no, userId: req.userId }).lean() : null;
  if (!o) return res.status(404).json({ error: 'Order not found' });
  res.json(toApi(o));
}));

module.exports = router;