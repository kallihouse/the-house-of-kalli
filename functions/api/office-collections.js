const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

const COLLECTIONS = Object.freeze([
  { code: 'taster', name: 'A Little Taste', type: 'Complimentary preview', position: 1 },
  { code: 'railed', name: 'Railed', type: 'Private collection', position: 2 },
  { code: 'good_girl', name: 'Good Girl', type: 'Private collection', position: 3 },
  { code: 'mouthful', name: 'Mouthful', type: 'Private collection', position: 4 },
  { code: 'private_play', name: 'Private Play', type: 'Private collection', position: 5 },
  { code: 'full_sessions', name: 'Full Sessions', type: 'Private collection', position: 6 },
]);

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ error: 'Collection records are not configured.' }, 503);
  const result = await context.env.DB.prepare(`
    SELECT collection_code, collection_name, access_url, updated_at
    FROM vault_collection_links
  `).all();
  const saved = Object.fromEntries((result.results || []).map((row) => [row.collection_code, row]));
  return json({ collections: COLLECTIONS.map((collection) => ({
    ...collection,
    access_url: saved[collection.code]?.access_url || '',
    updated_at: saved[collection.code]?.updated_at || '',
  })) });
}

export async function onRequestPatch(context) {
  if (!context.env.DB) return json({ error: 'Collection records are not configured.' }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const code = String(body.code || '');
  const collection = COLLECTIONS.find((item) => item.code === code);
  if (!collection) return json({ error: 'Collection not found.' }, 404);
  const accessUrl = String(body.access_url || '').trim().slice(0, 2000);
  if (accessUrl && !/^https:\/\//i.test(accessUrl)) {
    return json({ error: 'Enter a complete private HTTPS link.' }, 400);
  }
  await context.env.DB.prepare(`
    INSERT INTO vault_collection_links (collection_code, collection_name, access_url, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(collection_code) DO UPDATE SET
      collection_name = excluded.collection_name,
      access_url = excluded.access_url,
      updated_at = CURRENT_TIMESTAMP
  `).bind(code, collection.name, accessUrl).run();
  return json({ ok: true });
}
