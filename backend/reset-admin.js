require('dotenv').config();
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

(async () => {
  const email = 'sanskrutikadam86@gmail.com';

  const password = process.env.ADMIN_NEW_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set a strong ADMIN_NEW_PASSWORD in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const hash = await bcrypt.hash(password, 12);

  const result = await User.updateOne(
    { email, isAdmin: true },
    { $set: { passwordHash: hash } }
  );

  if (result.matchedCount === 0) {
    console.log('Admin account nahi mila. Koi change nahi hua.');
  } else {
    console.log('Admin password successfully reset!');
  }

  await mongoose.disconnect();
})().catch(async error => {
  console.error(error.message);
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exit(1);
});