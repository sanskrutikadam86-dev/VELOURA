require('dotenv').config();
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { User } = require('./models');

(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) { console.log('Aise chala: node make-admin.js tera@email.com'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const r = await User.updateOne({ email }, { $set: { isAdmin: true } });
  console.log(r.matchedCount ? email + ' ab admin hai' : 'Is email ka account nahi mila. Pehle site pe sign up kar.');
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });