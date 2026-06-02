// Care Crafter SMS API — Twilio proxy (keeps credentials off the browser)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'Missing to or message' });

  const sid   = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from  = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    return res.status(500).json({ error: 'Twilio credentials not configured in Vercel env vars' });
  }

  // Format phone number
  var phone = to.replace(/\D/g, '');
  if (phone.length === 10) phone = '+1' + phone;
  else if (phone.length === 11 && phone.startsWith('1')) phone = '+' + phone;
  else phone = '+' + phone;

  var body = 'To=' + encodeURIComponent(phone)
           + '&From=' + encodeURIComponent(from)
           + '&Body=' + encodeURIComponent(message);

  var url = 'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json';
  var auth = Buffer.from(sid + ':' + token).toString('base64');

  try {
    var r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body
    });
    var data = await r.json();
    if (r.ok) {
      res.status(200).json({ success: true, sid: data.sid });
    } else {
      res.status(400).json({ success: false, error: data.message || 'Twilio error' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
