const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

const authorised = (request, secret) => {
  const supplied = request.headers.get('Authorization') || '';
  return Boolean(secret) && supplied === `Bearer ${secret}`;
};

const COLLECTIONS = Object.freeze({
  taster: 'A Little Taste',
  railed: 'Railed',
  good_girl: 'Good Girl',
  mouthful: 'Mouthful',
  private_play: 'Private Play',
  full_sessions: 'Full Sessions',
});

const requiredCollections = (order) => {
  if (order.product_code === 'complete_vault') {
    return ['railed', 'good_girl', 'mouthful', 'private_play', 'full_sessions'];
  }
  if (['bundle_two', 'bundle_three'].includes(order.product_code)) {
    try {
      const values = JSON.parse(order.selected_collections || '[]');
      return Array.isArray(values) ? values.filter((value) => COLLECTIONS[value]) : [];
    } catch { return []; }
  }
  return COLLECTIONS[order.product_code] ? [order.product_code] : [];
};

export async function onRequestGet(context) {
  if (!context.env.DB || !authorised(context.request, context.env.VAULT_ADMIN_SECRET)) {
    return json({ error: 'Not authorised.' }, 401);
  }

  const [orders, links] = await Promise.all([
    context.env.DB.prepare(`
    SELECT id, public_token, order_reference, product_code, product_name, amount_cents,
           selected_collections, delivery_method, delivery_contact, status,
           access_url, created_at, updated_at
    FROM vault_orders
    ORDER BY id DESC
    LIMIT 100
  `).all(),
    context.env.DB.prepare(`
      SELECT collection_code, collection_name, access_url, updated_at
      FROM vault_collection_links
      ORDER BY CASE collection_code
        WHEN 'taster' THEN 1 WHEN 'railed' THEN 2 WHEN 'good_girl' THEN 3
        WHEN 'mouthful' THEN 4 WHEN 'private_play' THEN 5
        WHEN 'full_sessions' THEN 6 ELSE 99 END
    `).all(),
  ]);

  return json({ orders: orders.results || [], collection_links: links.results || [] });
}

export async function onRequestPatch(context) {
  if (!context.env.DB || !authorised(context.request, context.env.VAULT_ADMIN_SECRET)) {
    return json({ error: 'Not authorised.' }, 401);
  }

  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  if (body.action === 'save_collection_links') {
    const supplied = body.collection_links && typeof body.collection_links === 'object'
      ? body.collection_links
      : {};
    const statements = [];
    for (const [code, name] of Object.entries(COLLECTIONS)) {
      const url = String(supplied[code] || '').trim().slice(0, 2000);
      if (url && !/^https:\/\//i.test(url)) {
        return json({ error: `${name} needs a valid private HTTPS Dropbox link.` }, 400);
      }
      statements.push(context.env.DB.prepare(`
        INSERT INTO vault_collection_links (collection_code, collection_name, access_url, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(collection_code) DO UPDATE SET
          collection_name = excluded.collection_name,
          access_url = excluded.access_url,
          updated_at = CURRENT_TIMESTAMP
      `).bind(code, name, url));
    }
    await context.env.DB.batch(statements);
    return json({ ok: true });
  }

  const id = Number(body.id);
  const status = String(body.status || '');
  if (!Number.isInteger(id) || !['paid', 'cancelled'].includes(status)) {
    return json({ error: 'Invalid update.' }, 400);
  }

  if (status === 'paid') {
    const order = await context.env.DB.prepare(`
      SELECT product_code, selected_collections FROM vault_orders WHERE id = ?
    `).bind(id).first();
    if (!order) return json({ error: 'Order not found.' }, 404);

    const required = requiredCollections(order);
    const links = await context.env.DB.prepare(`
      SELECT collection_code, access_url FROM vault_collection_links
    `).all();
    const current = Object.fromEntries((links.results || []).map((link) => [link.collection_code, link.access_url]));
    const missing = required.filter((code) => !current[code]);
    if (!required.length || missing.length) {
      const names = missing.map((code) => COLLECTIONS[code] || code).join(', ');
      return json({ error: `Add the current Dropbox link${missing.length > 1 ? 's' : ''} for ${names || 'this collection'} first.` }, 400);
    }
  }

  const result = await context.env.DB.prepare(`
    UPDATE vault_orders
    SET status = ?, access_url = '', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, id).run();

  if (!result.meta?.changes) return json({ error: 'Order not found.' }, 404);
  return json({ ok: true });
}
