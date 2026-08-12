const fs = require('fs');
const Twilio = require('./node_modules/twilio');
const envText = fs.readFileSync('.env', 'utf-8');
const env = envText
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value !== undefined) {
      acc[key.trim()] = value.trim().replace(/^"|"$/g, '');
    }
    return acc;
  }, {});

console.log('env values:', {
  TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID ? 'set' : 'unset',
  TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN ? 'set' : 'unset',
  TWILIO_WHATSAPP_FROM: env.TWILIO_WHATSAPP_FROM,
  ADMIN_WHATSAPP_TO: env.ADMIN_WHATSAPP_TO,
});

const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
client.messages
  .create({
    to: env.ADMIN_WHATSAPP_TO,
    from: env.TWILIO_WHATSAPP_FROM,
    body: 'Test WhatsApp message from local debug',
  })
  .then((msg) => {
    console.log('sent', msg.sid);
  })
  .catch((err) => {
    console.error('error', err);
    process.exit(1);
  });
