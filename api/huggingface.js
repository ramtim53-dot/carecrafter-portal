// Hugging Face Inference API proxy — server engine for carecrafter.tools / rams-brain-ai
// Lives at /api/huggingface. The HF token stays in the HF_KEY
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

  const { prompt } = req.body || {};
  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: { message: 'Bad request' } });
    return;
  }

  try {
    const r = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.HF_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const contentType = r.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await r.json();
      res.status(r.status >= 400 ? r.status : 502).json({ error: { message: data.error || 'Hugging Face error' } });
      return;
    }
    if (!r.ok) {
      res.status(r.status).json({ error: { message: 'Hugging Face error (HTTP ' + r.status + ')' } });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(200).json({ base64: buf.toString('base64') });
  } catch (e) {
    res.status(502).json({ error: { message: 'Engine connection failed — try again.' } });
  }
};
