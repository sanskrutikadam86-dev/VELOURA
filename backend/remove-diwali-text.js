require('dotenv').config();
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { Product } = require('./models');

const NEW = {
  11: 'A set of brass diyas for pujas, quiet evenings and special occasions. Their warm metal glow looks lovely on a doorstep, a puja shelf or a window.',
  12: 'A marigold toran to hang at your main door and welcome guests on weddings, pujas and housewarmings. Bright colour that instantly lifts an entrance.',
  13: 'A pair of lanterns that give off a warm, glowing light. Hang them or place them on a balcony, an entrance or in the living room for celebrations and quiet evenings.'
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  let n = 0;
  for (const [id, text] of Object.entries(NEW)) {
    const r = await Product.updateOne({ id: Number(id), description: /diwali/i }, { $set: { description: text } });
    n += r.modifiedCount;
  }
  console.log(n + ' descriptions se Diwali hata diya');
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });