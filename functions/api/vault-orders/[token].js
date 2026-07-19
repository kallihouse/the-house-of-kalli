const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const COLLECTIONS = Object.freeze({
  taster: 'A Little Taste', railed: 'Railed', good_girl: 'Good Girl', mouthful: 'Mouthful',
  private_play: 'Private Play', full_sessions: 'Full Sessions',
});

const requiredCollections = (productCode, selections) => {
  if (productCode === 'complete_vault') {
    return ['railed', 'good_girl', 'mouthful', 'private_play', 'full_sessions'];
  }
  if (['bundle_two', 'bundle_three'].includes(productCode)) {
    return selections.filter((value) => COLLECTIONS[value]);
  }
  return COLLECTIONS[productCode] ? [productCode] : [];
};

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ error: 'The private order system is not connected yet.' }, 503);

  const token = String(context.params.token || '');
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return json({ error: 'Private order not found.' }, 404);

  const order = await context.env.DB.prepare(`
    SELECT order_reference, product_code, product_name, amount_cents, selected_collections,
           delivery_method, status, access_url, created_at
    FROM vault_orders
    WHERE public_token = ?
  `).bind(token).first();

  if (!order) return json({ error: 'Private order not found.' }, 404);

  let selections = [];
  try { selections = JSON.parse(order.selected_collections || '[]'); } catch { selections = []; }
  const accessLinks = [];
  if (order.status === 'paid') {
    const required = requiredCollections(order.product_code, selections);
    const links = await context.env.DB.prepare(`
      SELECT collection_code, collection_name, access_url FROM vault_collection_links
    `).all();
    const current = Object.fromEntries((links.results || []).map((link) => [link.collection_code, link]));
    for (const code of required) {
      const link = current[code];
      if (link?.access_url) accessLinks.push({ code, name: link.collection_name || COLLECTIONS[code], url: link.access_url });
    }
  }

  let settings = null;
  try {
    settings = await context.env.DB.prepare(`SELECT payid_enabled,payid_value,payid_name,paypal_enabled,paypal_url,default_payment_method FROM house_settings WHERE id=1`).first();
  } catch { settings = null; }
  const payidEnabled = settings ? Boolean(settings.payid_enabled) : true;

  return json({
    reference: order.order_reference,
    product: order.product_name,
    amount: order.amount_cents,
    selections,
    delivery_method: order.delivery_method,
    status: order.status,
    access_links: accessLinks,
    payid: payidEnabled ? (settings?.payid_value || context.env.PAYID_VALUE || '') : '',
    payid_name: payidEnabled ? (settings?.payid_name || context.env.PAYID_NAME || '') : '',
    paypal_enabled: Boolean(settings?.paypal_enabled && settings?.paypal_url),
    paypal_url: settings?.paypal_enabled ? settings?.paypal_url || '' : '',
    paypal_checkout_enabled: Boolean(settings?.paypal_enabled && context.env.PAYPAL_CLIENT_ID && context.env.PAYPAL_CLIENT_SECRET),
    default_payment_method: settings?.default_payment_method || 'payid',
    created_at: order.created_at,
  });
}
