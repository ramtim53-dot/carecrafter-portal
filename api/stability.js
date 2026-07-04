// Stability AI proxy — server engine for carecrafter.tools / rams-brain-ai
// Lives at /api/stability. The Stability key stays in the STABILITY_KEY
// environment variable on Vercel — it is never sent to visitors' browsers.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST only' } });
    return;
  }
  if (!process.env.STABILITY_KEY) {
    res.status(500).json({ error: { message: 'Server engine not configured yet (missing STABILITY_KEY).' } });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: { message: 'Bad request' } });
    return;
  }

  try {
    const r = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + process.env.STABILITY_KEY
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30
      })
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: { message: (data && data.message) || 'Stability AI error' } });
      return;
    }
    const b64 = data.artifacts && data.artifacts[0] && data.artifacts[0].base64;
    if (!b64) {
      res.status(502).json({ error: { message: 'The model returned no image — try rewording the request.' } });
      return;
    }
    res.status(200).json({ base64: b64 });
  } catch (e) {
    res.status(502).json({ error: { message: 'Engine connection failed — try again.' } });
  }
};
