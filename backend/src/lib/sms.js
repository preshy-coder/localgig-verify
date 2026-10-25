async function sendSms(phone, message) {
  // Development: print the text instead of sending it.
  if (!process.env.SMS_PROVIDER || process.env.SMS_PROVIDER === 'console') {
    console.log(`[SMS to ${phone}] ${message}`);
    return { ok: true };
  }
  // A real provider is connected later, in feature/sms-integration.
  return { ok: false };
}

module.exports = { sendSms };