const https = require('https');
const http = require('http');
const { URL } = require('url');

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 4500
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function cleanHtml(str) {
  return (str || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const query = (event.queryStringParameters && event.queryStringParameters.q) || '';
  if (!query.trim()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query parameter q is required' }) };
  }

  const results = [];

  // 1. Google News RSS for live events, prices, breaking news
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const rssData = await fetchUrl(rssUrl);
    
    // Parse items
    const itemMatches = rssData.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of itemMatches.slice(0, 5)) {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/);

      const title = titleMatch ? cleanHtml(titleMatch[1]) : '';
      const link = linkMatch ? cleanHtml(linkMatch[1]) : '';
      const date = dateMatch ? cleanHtml(dateMatch[1]) : '';
      const source = sourceMatch ? cleanHtml(sourceMatch[1]) : '';

      if (title && link) {
        results.push({
          title,
          url: link,
          snippet: `${source ? `[${source}] ` : ''}${title} (${date})`,
          source: source || 'Google News',
          date
        });
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 2. Wikipedia search fallback for general knowledge / background
  if (results.length < 3) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`;
      const wikiRaw = await fetchUrl(wikiUrl);
      const wikiJson = JSON.parse(wikiRaw);
      const searchItems = (wikiJson.query && wikiJson.query.search) || [];
      for (const item of searchItems) {
        const title = item.title;
        const snippet = cleanHtml(item.snippet);
        const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
        results.push({
          title,
          url,
          snippet,
          source: 'Wikipedia'
        });
      }
    } catch (err) {}
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      query,
      timestamp: new Date().toISOString(),
      results
    })
  };
};
