const mongoose = require('mongoose');
const { Product, User, Order } = require('./models');
const seed = require('./data/products');

async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI nahi mila. backend/.env file check kar.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB se connect ho gaya');

  await Promise.all([Product.init(), User.init(), Order.init()]);   // unique indexes tayyar

  // Pehli baar products.js ki list database me daalo
  if (await Product.countDocuments() === 0) {
    await Product.insertMany(seed.map(p => ({
      id: p.id, name: p.name, room: p.room, style: p.style, price: p.price, discount: p.off,
      emoji: p.emoji, c1: p.c1, c2: p.c2, fest: !!p.fest,
      image: 'images/products/p' + p.id + '.jpg'
    })));
    console.log('Database me', seed.length, 'products daale gaye');
  }
}

module.exports = { connectDb };