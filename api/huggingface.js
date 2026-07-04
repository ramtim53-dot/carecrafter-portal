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

  const { prompt, image } = req.body || {};
  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: { message: 'Bad request' } });
    return;
  }

  try {
    const model = image ? 'timbrooks/instruct-pix2pix' : 'stabilityai/stable-diffusion-xl-base-1.0';
    const body = image
      ? { inputs: image, parameters: { prompt } }
      : { inputs: prompt };

    const r = await fetch('https://api-inference.huggingface.co/models/' + model, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.HF_KEY.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const contentType = r.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await r.json();
      let msg = data.error || 'Hugging Face error';
      if (data.error && data.estimated_time) msg += ' (~' + Math.ceil(data.estimated_time) + 's) — the model is loading, try again shortly.';
      res.status(r.status >= 400 ? r.status : 502).json({ error: { message: msg } });
      return;
    }
    if (!r.ok) {
      const bodyText = await r.text().catch(() => '');
      res.status(r.status).json({ error: { message: 'Hugging Face error (HTTP ' + r.status + '): ' + bodyText.slice(0, 200) } });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(200).json({ base64: buf.toString('base64') });
  } catch (e) {
    const detail = (e && e.cause && e.cause.message) ? e.cause.message : (e && e.message) || 'unknown error';
    res.status(502).json({ error: { message: 'Engine connection failed: ' + detail } });
  }
};
