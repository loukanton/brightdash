import { getStore } from '@netlify/blobs';

// De sitemap kan niet meer een vast bestand zijn: er komt elke week een
// pagina bij. De vaste pagina's staan hier, de weekoverzichten komen uit de
// blob-index `weken`.

const BASIS = 'https://brightdash.nl';

const VAST = [
  { pad: '/', freq: 'hourly', prio: '1.0' },
  { pad: '/week', freq: 'weekly', prio: '0.7' },
  { pad: '/privacy', freq: 'monthly', prio: '0.3' },
  { pad: '/disclaimer', freq: 'monthly', prio: '0.3' }
];

export default async () => {
  let weken = [];
  try {
    const store = getStore('brightdash');
    weken = await store.get('weken', { type: 'json' }) || [];
  } catch {}

  const regels = [
    ...VAST.map(p => `  <url>\n    <loc>${BASIS}${p.pad}</loc>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.prio}</priority>\n  </url>`),
    ...weken.map(w => `  <url>\n    <loc>${BASIS}/week/${w.maandag}</loc>\n    <changefreq>never</changefreq>\n    <priority>0.6</priority>\n  </url>`)
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${regels.join('\n')}\n</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
};

export const config = { path: '/sitemap.xml' };
