require('dotenv').config();
const { send, configured } = require('./mailer');

if (!configured) { console.log('SMTP_HOST, SMTP_USER, SMTP_PASS .env me nahi hain'); process.exit(1); }
send(process.env.ADMIN_EMAIL, 'VELOURA test email', '<p>Email chal raha hai ✔</p>')
  .then(() => console.log('Test email bhej diya. Inbox (aur Spam) dekh.'))
  .catch(e => console.error('Fail:', e.message));