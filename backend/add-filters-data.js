require('dotenv').config();
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { Product } = require('./models');

// Sirf naam se jo saaf pata chalta hai wahi bhara hai. Jo pakka nahi pata, wo khaali chhoda hai.
const DATA = {
  1:  { category: 'Lighting',   material: 'Cane' },
  2:  { category: 'Rugs',       material: 'Jute' },
  3:  { category: 'Mirrors',    material: 'Brass' },
  4:  { category: 'Cushions',   material: 'Linen' },
  5:  { category: 'Vases',      material: 'Ceramic' },
  6:  { category: 'Furniture',  material: 'Wood' },
  7:  { category: 'Bedding',    material: 'Cotton' },
  8:  { category: 'Wall decor' },
  9:  { category: 'Storage' },
  10: { category: 'Planters',   material: 'Terracotta' },
  11: { category: 'Festive',    material: 'Brass' },
  12: { category: 'Festive' },
  13: { category: 'Festive' },
  14: { category: 'Wall decor', material: 'Wood' }
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  let done = 0;
  for (const [id, d] of Object.entries(DATA)) {
    const set = {};
    if (d.category) set.category = d.category;
    if (d.material) set.material = d.material;
    // jis field me tune pehle se kuch likha hai use nahi badalti
    for (const k of Object.keys(set)) {
      const r = await Product.updateOne({ id: Number(id), $or: [{ [k]: '' }, { [k]: null }, { [k]: { $exists: false } }] }, { $set: { [k]: set[k] } });
      done += r.modifiedCount;
    }
  }
  console.log(done + ' fields bhar diye gaye');
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });