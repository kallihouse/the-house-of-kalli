const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const PRODUCTS = Object.freeze({
  railed: { name: 'Railed', amount: 24900 },
  good_girl: { name: 'Good Girl', amount: 29900 },
  mouthful: { name: 'Mouthful', amount: 24900 },
  private_play: { name: 'Private Play', amount: 29900 },
  full_sessions: { name: 'Full Sessions', amount: 34900 },
  bundle_two: { name: 'Two Rooms', amount: 44900, selections: 2 },
  bundle_three: { name: 'Three Rooms', amount: 59900, selections: 3 },
  complete_vault: { name: 'Every Room', amount: 69900 },
});

const COLLECTIONS = new Set(['railed', 'good_girl', 'mouthful', 'private_play', 'full_sessions']);
const DELIVERY_METHODS = new Set(['private', 'email', 'text', 'whatsapp']);

const makeToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const makeReference = () => {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `HK-${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')}`;
};

const makeLookup = async (value, secret) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value.normalize('NFKC')));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function onRequestPost(context) {
  if (!context.env.DB || !context.env.ROOM_PASSWORD_SECRET) {
    return json({ error: 'The private order system is not connected yet.' }, 503);
  }
  if (!context.env.PAYID_VALUE || !context.env.PAYID_NAME) {
    return json({ error: 'PayID checkout is being prepared.' }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid order.' }, 400);
  }

  const productCode = String(body.product_code || '');
  const product = PRODUCTS[productCode];
  const deliveryMethod = String(body.delivery_method || '');
  const deliveryContact = String(body.delivery_contact || '').trim().slice(0, 200);
  const password = String(body.private_password || '');
  const passwordConfirm = String(body.private_password_confirm || '');
  let selections = [...new Set(
    Array.isArray(body.selected_collections) ? body.selected_collections.map(String) : []
  )].filter((value) => COLLECTIONS.has(value));

  if (productCode === 'complete_vault') selections = [...COLLECTIONS];

  if (!product || !DELIVERY_METHODS.has(deliveryMethod) || body.age_confirmed !== true) {
    return json({ error: 'Please complete every required field.' }, 400);
  }
  if (product.selections && selections.length !== product.selections) {
    return json({ error: `Please choose exactly ${product.selections} collections.` }, 400);
  }
  if (!product.selections && productCode !== 'complete_vault' && selections.length) {
    return json({ error: 'Invalid collection selection.' }, 400);
  }
  if (deliveryMethod !== 'private' && !deliveryContact) {
    return json({ error: 'Please add your delivery details.' }, 400);
  }
  if (deliveryMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryContact)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (['text', 'whatsapp'].includes(deliveryMethod) && !/^[+\d][\d\s()-]{7,24}$/.test(deliveryContact)) {
    return json({ error: 'Please enter a valid mobile number.' }, 400);
  }
  if (deliveryMethod === 'private' && (password.length < 8 || password.length > 128)) {
    return json({ error: 'Your private password must be at least 8 characters.' }, 400);
  }
  if (deliveryMethod === 'private' && password !== passwordConfirm) {
    return json({ error: 'Your private passwords do not match.' }, 400);
  }

  const passwordLookup = deliveryMethod === 'private'
    ? await makeLookup(password, context.env.ROOM_PASSWORD_SECRET)
    : null;

  if (passwordLookup) {
    const existing = await context.env.DB.prepare(`
      SELECT id FROM vault_orders WHERE password_lookup = ?
    `).bind(passwordLookup).first();
    if (existing) return json({ error: 'That password is already in use. Please choose another.' }, 409);
  }

  let token;
  let reference;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    token = makeToken();
    reference = makeReference();
    try {
      await context.env.DB.prepare(`
        INSERT INTO vault_orders (
          public_token, order_reference, password_lookup, product_code, product_name,
          amount_cents, selected_collections, delivery_method, delivery_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        token, reference, passwordLookup, productCode, product.name, product.amount,
        JSON.stringify(selections), deliveryMethod, deliveryContact
      ).run();

      return json({ token }, 201);
    } catch (error) {
      if (attempt === 3) {
        console.error('vault_order_insert_failed', error);
        return json({ error: 'Your order could not be created. Please try again.' }, 500);
      }
    }
  }
}
