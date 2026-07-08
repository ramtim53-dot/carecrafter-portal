// NewsAPI.org proxy — server engine for Regular News on the portal.
// Lives at /api/news. The key stays in the NEWSAPI_KEY environment variable
// on Vercel — NewsAPI's free tier blocks direct browser calls from deployed
// domains (CORS-restricted to localhost), so this proxy is required.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.status(405).json({ error: { message: 'GET only' } });
    return;
  }
  if (!process.env.NEWSAPI_KEY) {
    res.status(500).json({ error: { message: 'Server engine not configured yet (missing NEWSAPI_KEY).' } });
    return;
  }

  const category = (req.query.category || 'general').toString();
  const country = (req.query.country || 'us').toString();

  try {
    const url = 'https://newsapi.org/v2/top-headlines?country=' + encodeURIComponent(country)
      + '&category=' + encodeURIComponent(category) + '&pageSize=20';
    const r = await fetch(url, { headers: { 'X-Api-Key': process.env.NEWSAPI_KEY } });
    const data = await r.json();
    if (data.status !== 'ok') {
      res.status(r.status).json({ error: { message: data.message || 'NewsAPI error' } });
      return;
    }
    res.status(200).json({ articles: data.articles || [] });
  } catch (e) {
    res.status(502).json({ error: { message: 'Engine connection failed: ' + ((e && e.message) || 'unknown error') } });
  }
};
