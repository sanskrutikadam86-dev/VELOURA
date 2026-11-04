const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  id:       { type: Number, required: true, unique: true },   // seedhe numbers: 1, 2, 3...
  name:     { type: String, required: true, trim: true },
  room:     { type: String, required: true },
  style:    { type: String, required: true },
  price:    { type: Number, required: true, min: 0 },         // asli MRP
  discount: { type: Number, default: 0, min: 0, max: 90 },    // % off
  emoji: String, c1: String, c2: String,
  fest:     { type: Boolean, default: false },
  stock:    { type: Number, default: 25, min: 0 },
    description: { type: String, default: '' },
      category:    { type: String, default: '' },
  material:    { type: String, default: '' },
  heightCm:    { type: Number, default: null, min: 0 },
    ratingAvg:   { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  image:    String
});

const userSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: '' },
  isAdmin:      { type: Boolean, default: false }
}, { timestamps: true });
const otpSchema = new Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  codeHash:  { type: String, required: true },     // code seedha nahi, hash karke rakhte hain
  attempts:  { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // expire hote hi MongoDB khud delete kar deta hai
const orderSchema = new Schema({
  orderNo:       { type: Number, required: true, unique: true },
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status:        { type: String, default: 'Placed', enum: ['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'] },
  paymentMethod: { type: String, default: 'COD' },
  shipping: { name: String, phone: String, address: String, city: String, state: String, pincode: String },
  items: [{ _id: false, productId: Number, name: String, price: Number, qty: Number }],
  subtotal: Number,
  discount: { type: Number, default: 0 },
  delivery: { type: Number, default: 0 },
  total:    Number,
  coupon:   { type: String, default: null }
}, { timestamps: true });

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
const reviewSchema = new Schema({
  productId: { type: Number, required: true, index: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String, required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  title:     { type: String, default: '' },
  text:      { type: String, required: true },
  verified:  { type: Boolean, default: true },
  status:    { type: String, enum: ['published', 'hidden'], default: 'published' }
}, { timestamps: true });
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });   // ek user, ek product, ek review
const Review = mongoose.model('Review', reviewSchema);

// product ka average aur kitne reviews, dobara nikalta hai
async function recalcRating(productId) {
  const [g] = await Review.aggregate([
    { $match: { productId, status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }
  ]);
  await Product.updateOne({ id: productId }, { $set: { ratingAvg: g ? g.avg : 0, ratingCount: g ? g.n : 0 } });
}

const Product = mongoose.model('Product', productSchema);
const User    = mongoose.model('User', userSchema);
const Order   = mongoose.model('Order', orderSchema);
const Counter = mongoose.model('Counter', counterSchema);
const subscriberSchema = new Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});
const Subscriber = mongoose.model('Subscriber', subscriberSchema);
const Otp = mongoose.model('Otp', otpSchema);

// Order number: 1, 2, 3... (VLR00001, VLR00002...)
async function nextSeq(name) {
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

module.exports = { Product, User, Order, Otp, Subscriber, Review, recalcRating, nextSeq };