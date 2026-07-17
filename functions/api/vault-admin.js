const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

const authorised = (request, secret) => {
  const supplied = request.headers.get('Authorization') || '';
  return Boolean(secret) && supplied === `Bearer ${secret}`;
};

export async function onRequestGet(context) {
  if (!context.env.DB || !authorised(context.request, context.env.VAULT_ADMIN_SECRET)) {
    return json({ error: 'Not authorised.' }, 401);
  }

  const orders = await context.env.DB.prepare(`
    SELECT id, public_token, order_reference, product_name, amount_cents,
           selected_collections, delivery_method, delivery_contact, status,
           access_url, created_at, updated_at
    FROM vault_orders
    ORDER BY id DESC
    LIMIT 100
  `).all();

  return json({ orders: orders.results || [] });
}

export async function onRequestPatch(context) {
  if (!context.env.DB || !authorised(context.request, context.env.VAULT_ADMIN_SECRET)) {
    return json({ error: 'Not authorised.' }, 401);
  }

  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }

  const id = Number(body.id);
  const status = String(body.status || '');
  const accessUrls = Array.isArray(body.access_urls)
    ? body.access_urls.map((url) => String(url).trim()).filter(Boolean).slice(0, 10)
    : [];
  if (!Number.isInteger(id) || !['paid', 'cancelled'].includes(status)) {
    return json({ error: 'Invalid update.' }, 400);
  }
  if (status === 'paid' && (!accessUrls.length || accessUrls.some((url) => !/^https:\/\//i.test(url)))) {
    return json({ error: 'Paste each private HTTPS Dropbox link on its own line before marking this paid.' }, 400);
  }

  const result = await context.env.DB.prepare(`
    UPDATE vault_orders
    SET status = ?, access_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, status === 'paid' ? JSON.stringify(accessUrls) : '', id).run();

  if (!result.meta?.changes) return json({ error: 'Order not found.' }, 404);
  return json({ ok: true });
}
