const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ error: 'The private order system is not connected yet.' }, 503);

  const token = String(context.params.token || '');
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return json({ error: 'Private order not found.' }, 404);

  const order = await context.env.DB.prepare(`
    SELECT order_reference, product_name, amount_cents, selected_collections,
           delivery_method, status, access_url, created_at
    FROM vault_orders
    WHERE public_token = ?
  `).bind(token).first();

  if (!order) return json({ error: 'Private order not found.' }, 404);

  let accessUrls = [];
  if (order.status === 'paid' && order.access_url) {
    try {
      const parsed = JSON.parse(order.access_url);
      accessUrls = Array.isArray(parsed) ? parsed : [order.access_url];
    } catch {
      accessUrls = [order.access_url];
    }
  }

  return json({
    reference: order.order_reference,
    product: order.product_name,
    amount: order.amount_cents,
    selections: JSON.parse(order.selected_collections || '[]'),
    delivery_method: order.delivery_method,
    status: order.status,
    access_urls: accessUrls,
    payid: context.env.PAYID_VALUE || '',
    payid_name: context.env.PAYID_NAME || '',
    created_at: order.created_at,
  });
}
