export default async (req, context) => {
  const url = new URL(req.url);
  const feedUrl = url.searchParams.get('url');

  if (!feedUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'BrightDash/1.0 RSS Reader' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return new Response(`Feed error: ${res.status}`, { status: res.status });
    }

    const text = await res.text();

    return new Response(text, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (err) {
    return new Response(`Fetch failed: ${err.message}`, { status: 500 });
  }
};

export const config = {
  path: '/api/proxy'
};
