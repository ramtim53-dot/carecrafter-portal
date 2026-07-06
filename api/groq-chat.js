// Groq chat proxy — server engine for carecrafter.tools / Brain AI
// Lives at /api/groq-chat. The Groq key stays in the GROQ_KEY
// environment variable on Vercel — it is never sent to visitors' browsers.

module.exports = async (req, res) => {
  // Allow calls from the Care Crafter Chrome extension (chrome-extension:// origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  if (!process.env.GROQ_KEY) {
    res.status(500).json({ error: { message: 'Server engine not configured yet (missing GROQ_KEY).' } });
    return;
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: { message: 'Bad request' } });
    return;
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_KEY.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages
      })
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: { message: (data.error && data.error.message) || 'Groq error' } });
      return;
    }
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) {
      res.status(502).json({ error: { message: 'Empty response from Groq' } });
      return;
    }
    res.status(200).json({ text });
  } catch (e) {
    const detail = (e && e.cause && e.cause.message) ? e.cause.message : (e && e.message) || 'unknown error';
    res.status(502).json({ error: { message: 'Engine connection failed: ' + detail } });
  }
};
