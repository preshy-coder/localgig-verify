
async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'console') {
    console.log(`[SMS to ${phone}] ${message}`);
    return { ok: true };
  }

  if (provider === 'africastalking') {
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;
    if (!username || !apiKey) {
      console.error('SMS not sent: AT_USERNAME or AT_API_KEY is missing');
      return { ok: false };
    }

    const host = username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com';

    const form = new URLSearchParams({ username, to: phone, message });
    if (process.env.AT_SENDER_ID) form.set('from', process.env.AT_SENDER_ID);

    try {
      const response = await fetch(`${host}/version1/messaging`, {
        method: 'POST',
        headers: {
          apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error('SMS failed, status', response.status);
        return { ok: false };
      }

      const data = await response.json();
      const recipient = data?.SMSMessageData?.Recipients?.[0];
      // Africa's Talking
      if (!recipient || recipient.status !== 'Success') {
        console.error('SMS rejected:', recipient?.status || 'no recipient');
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error('SMS error:', err.message);
      return { ok: false };
    }
  }

  console.error('Unknown SMS_PROVIDER:', provider);
  return { ok: false };
}

module.exports = { sendSms };