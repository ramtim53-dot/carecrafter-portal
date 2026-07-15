// Generic RSS feed proxy — server engine for the portal's news features.
// Lives at /api/rss?url=<feed-url>. Fetches the feed server-side and returns
// the raw XML, so the browser never needs a third-party CORS proxy (those
// free services — corsproxy.io, allorigins.win, etc. — are unreliable and
// go down/rate-limit unpredictably). This runs on your own Vercel infra.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.status(405).json({ error: { message: 'GET only' } });
    return;
  }

  const feedUrl = (req.query.url || '').toString();
  if (!feedUrl || !/^https?:\/\//i.test(feedUrl)) {
    res.status(400).json({ error: { message: 'Missing or invalid url parameter' } });
    return;
  }

  try {
    const r = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareCrafterPortal/1.0; +https://carecrafter-portal.vercel.app)' }
    });
    if (!r.ok) {
      res.status(r.status).json({ error: { message: 'Feed returned HTTP ' + r.status } });
      return;
    }
    const text = await r.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'Feed fetch failed: ' + ((e && e.message) || 'unknown error') } });
  }
};
