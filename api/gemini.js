// Ram's Brain AI — server engine for carecrafter.tools
// Lives at /api/gemini. The Gemini key stays in the GEMINI_KEY environment
// variable on Vercel — it is never sent to visitors' browsers.

const DAILY_LIMIT = 40;                    // free requests per visitor per day
const ALLOWED = ['gemini-2.5-flash', 'gemini-2.5-flash-image'];
const usage = {};                          // { ip: { day, count } } per warm instance

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  if (!process.env.GEMINI_KEY) {
    res.status(500).json({ error: { message: 'Server engine not configured yet (missing GEMINI_KEY).' } });
    return;
  }

  // --- simple daily limit per visitor ---
  const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim();
  const day = new Date().toISOString().slice(0, 10);
  const u = usage[ip] && usage[ip].day === day ? usage[ip] : { day, count: 0 };
  u.count++;
  usage[ip] = u;
  if (u.count > DAILY_LIMIT) {
    res.status(429).json({ error: { message: 'Daily free limit reached — come back tomorrow!' } });
    return;
  }

  // --- validate request ---
  const { model, payload } = req.body || {};
  if (!ALLOWED.includes(model)) {
    res.status(400).json({ error: { message: 'Model not allowed' } });
    return;
  }
  if (!payload || !payload.contents) {
    res.status(400).json({ error: { message: 'Bad request' } });
    return;
  }

  // --- forward to Google ---
  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model +
      ':generateContent?key=' + encodeURIComponent(process.env.GEMINI_KEY),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: { message: 'Engine connection failed — try again.' } });
  }
};
