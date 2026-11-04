require('dotenv').config();           // sabse upar rahe
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);   // tere network pe Atlas se jodne ke liye
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDb } = require('./db');

const app = express();

// Site live hone ke baad (hosting ke peeche) isse uncomment karna: app.set('trust proxy', 1);

// Security headers. CSP abhi isliye band hai ki hamare pages me inline script/style hai.
app.use(helmet({ contentSecurityPolicy: false }));

// Site aur API ek hi server se chalte hain, isliye bahar ke sites ko API ki ijazat nahi.
// Zarurat pade to .env me CORS_ORIGIN=https://tumhari-site.com daal sakti hai.
const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : false }));

app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => { console.log(req.method, req.url); next(); });

// Kisi ek IP se bahut zyada requests aaye to rok do
const limiter = (minutes, limit, msg) => rateLimit({
  windowMs: minutes * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false,
  message: { error: msg }
});
app.use('/api', limiter(15, 300, 'Too many requests. Please try again in a few minutes.'));
app.use('/api/auth/login', limiter(15, 10, 'Too many login attempts. Please try again in 15 minutes.'));
app.use('/api/auth/otp/request', limiter(15, 8, 'Too many code requests. Please try again in 15 minutes.'));
app.use('/api/auth/otp/verify', limiter(15, 30, 'Too many attempts. Please try again in 15 minutes.'));
app.post('/api/orders', limiter(60, 20, 'Too many orders from this network. Please try again later.'));
app.use('/api/subscribe', limiter(60, 10, 'Too many requests. Please try again later.'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.post('/api/reviews/:productId', limiter(60, 15, 'Too many reviews from this network. Please try again later.'));
app.use('/api/reviews', require('./routes/reviews'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VELOURA server chal raha hai' });
});
app.use('/api/products', require('./routes/products'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Kisi bhi error pe server crash na ho
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 400 ? 'Bad request' : 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;
connectDb()
  .then(() => app.listen(PORT, () => console.log(`Server chal raha hai: http://localhost:${PORT}`)))
  .catch(err => { console.error('Database se connect nahi ho paya:', err.message); process.exit(1); });