const express = require('express');
const { Subscriber } = require('../models');
const { wrap } = require('../utils');

const router = express.Router();

// POST /api/subscribe   body: { email }
router.post('/', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 190) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  // pehle se juda ho to bhi wahi jawab, taaki koi dusre ka email check na kar sake
  await Subscriber.updateOne({ email }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  res.json({ ok: true });
}));

module.exports = router;