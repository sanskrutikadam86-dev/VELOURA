const nodemailer = require('nodemailer');

const configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const port = Number(process.env.SMTP_PORT) || 465;
const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;
if (!configured) console.log('Email abhi band hai (.env me SMTP_HOST, SMTP_USER, SMTP_PASS nahi mile)');

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const orderNo = id => 'VLR' + String(id).padStart(5, '0');

async function send(to, subject, html) {
  if (!transporter) return;
  await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
}

// Email ka dhancha. Customer ka diya hua sab kuch esc() se saaf karke daalte hain.
function orderHtml(o, introHtml) {
  const s = o.shipping;
  const rows = o.items.map(i =>
    `<tr><td style="padding:6px 0">${esc(i.name)} × ${i.qty}</td><td style="padding:6px 0;text-align:right">${inr(i.price * i.qty)}</td></tr>`).join('');
  const line = (label, val, bold) =>
    `<tr><td style="padding:4px 0;color:#6d6275">${label}</td><td style="padding:4px 0;text-align:right;${bold ? 'font-weight:700;font-size:16px' : ''}">${val}</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e1625">
    <div style="background:#2c0f36;color:#d9b66b;padding:18px 24px;letter-spacing:6px;font-weight:700">VELOURA</div>
    <div style="padding:24px;border:1px solid #e4dce9;border-top:0">
      ${introHtml}
      <p style="margin:16px 0 0"><b>Order ${orderNo(o.orderNo)}</b></p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${rows}
        <tr><td colspan="2" style="border-top:1px solid #e4dce9"></td></tr>
        ${line('Subtotal', inr(o.subtotal))}
        ${o.discount ? line('Coupon ' + esc(o.coupon), '− ' + inr(o.discount)) : ''}
        ${line('Delivery', o.delivery ? inr(o.delivery) : 'Free')}
        ${line('Total', inr(o.total), true)}
      </table>
      <p style="margin:0 0 4px"><b>Delivery address</b></p>
      <p style="margin:0;color:#3b3144">${esc(s.name)}, ${esc(s.phone)}<br>${esc(s.address)}<br>${esc(s.city)}, ${esc(s.state)} ${esc(s.pincode)}</p>
    </div></div>`;
}
// Login ka code. Yahan error pakadte nahi, route khud sambhalta hai.
async function sendOtp(to, code) {
  await send(to, `${code} is your VELOURA login code`,
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e1625">
       <div style="background:#2c0f36;color:#d9b66b;padding:18px 24px;letter-spacing:6px;font-weight:700">VELOURA</div>
       <div style="padding:24px;border:1px solid #e4dce9;border-top:0">
         <p>Your login code is</p>
         <p style="font-size:32px;letter-spacing:10px;font-weight:700;margin:8px 0 16px">${code}</p>
         <p style="color:#6d6275">It is valid for 10 minutes. If you did not ask for it, you can ignore this email.</p>
       </div>
     </div>`);
}

// Naya order: customer ko confirmation, aur tujhe alert. Fail ho to order pe asar nahi padta.
async function notifyNewOrder(o, customerEmail) {
  if (!transporter) return;
  const tasks = [];
  if (customerEmail) {
    tasks.push(send(customerEmail, `Your VELOURA order ${orderNo(o.orderNo)} is confirmed`,
      orderHtml(o, `<p>Hi ${esc(o.shipping.name)}, thank you for your order! We have received it and will email you when it ships.</p>
                    <p>Payment: cash on delivery. Please keep ${inr(o.total)} ready.</p>`)));
  }
  if (process.env.ADMIN_EMAIL) {
    tasks.push(send(process.env.ADMIN_EMAIL, `New order ${orderNo(o.orderNo)} · ${inr(o.total)}`,
      orderHtml(o, '<p><b>New order received.</b> Open the admin panel to pack and ship it.</p>')));
  }
  const results = await Promise.allSettled(tasks);
  results.forEach(r => { if (r.status === 'rejected') console.error('Email nahi gaya:', r.reason && r.reason.message); });
}

// Status badalne pe customer ko email (Packed pe nahi bhejte)
const STATUS_TEXT = {
  Shipped:   'Good news! Your order has been shipped and is on its way to you.',
  Delivered: 'Your order has been marked as delivered. We hope you love it!',
  Cancelled: 'Your order has been cancelled. If you did not expect this, please contact us.'
};
async function notifyStatus(o, customerEmail, status) {
  if (!transporter || !customerEmail || !STATUS_TEXT[status]) return;
  try {
    await send(customerEmail, `Your VELOURA order ${orderNo(o.orderNo)}: ${status}`,
      orderHtml(o, `<p>Hi ${esc(o.shipping.name)}, ${STATUS_TEXT[status]}</p>`));
  } catch (e) { console.error('Email nahi gaya:', e.message); }
}

module.exports = { notifyNewOrder, notifyStatus, sendOtp, send, configured };