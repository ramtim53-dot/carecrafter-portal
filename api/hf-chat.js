// Hugging Face chat proxy — server engine for carecrafter.tools / rams-brain-ai
// Lives at /api/hf-chat. The HF token stays in the HF_KEY
// environment variable on Vercel — it is never sent to visitors' browsers.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  if (!process.env.HF_KEY) {
    res.status(500).json({ error: { message: 'Server engine not configured yet (missing HF_KEY).' } });
    return;
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: { message: 'Bad request' } });
    return;
  }

  try {
    const r = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.HF_KEY.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:fastest',
        messages
      })
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: { message: (data.error && data.error.message) || 'Hugging Face chat error' } });
      return;
    }
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) {
      res.status(502).json({ error: { message: 'Empty response from Hugging Face' } });
      return;
    }
    res.status(200).json({ text });
  } catch (e) {
    const detail = (e && e.cause && e.cause.message) ? e.cause.message : (e && e.message) || 'unknown error';
    res.status(502).json({ error: { message: 'Engine connection failed: ' + detail } });
  }
};
