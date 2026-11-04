const { Product } = require('./models');
const { salePrice } = require('./utils');

const FREE_AT = 1999, DELIVERY = 99;

const COUPONS = {
  HOME10:  { type: 'percent', value: 10,  min: 1999 },
  COZY15:  { type: 'percent', value: 15,  min: 2999 },
  GIFT500: { type: 'flat',    value: 500, min: 4999 }
};

// Browser se sirf id aur qty lete hain. Naam aur price hamesha database se.
async function priceCart(raw) {
  const qtyById = new Map();
  for (const it of Array.isArray(raw) ? raw : []) {
    const id = Number(it && it.id);
    if (!Number.isInteger(id)) continue;
    const q = Math.max(1, Math.floor(Number(it.qty) || 1));
    qtyById.set(id, Math.min(10, (qtyById.get(id) || 0) + q));
  }

  const items = [];
  if (qtyById.size) {
    const rows = await Product.find({ id: { $in: [...qtyById.keys()] } }).lean();
    for (const p of rows) {
      items.push({
        id: p.id, name: p.name, qty: qtyById.get(p.id),
        price: salePrice({ price: p.price, off: p.discount }), stock: p.stock
      });
    }
    items.sort((a, b) => a.id - b.id);
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  return { items, subtotal };
}

function checkCoupon(code, subtotal) {
  const key = String(code || '').trim().toUpperCase();
  const c = COUPONS[key];
  if (!c) return { ok: false, error: 'Invalid coupon code' };
  if (subtotal < c.min) return { ok: false, error: `Add items worth ₹${c.min - subtotal} more to use ${key}` };
  const discount = c.type === 'percent' ? Math.round(subtotal * c.value / 100) : c.value;
  return { ok: true, code: key, discount: Math.min(discount, subtotal) };
}

const deliveryFor = subtotal => (subtotal === 0 || subtotal >= FREE_AT ? 0 : DELIVERY);

module.exports = { priceCart, checkCoupon, deliveryFor };