const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

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
    return json({ error: 'Private order passwords are not connected yet.' }, 503);
  }

  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const password = String(body.private_password || '');
  if (password.length < 8 || password.length > 128) {
    return json({ error: 'Please enter your private password.' }, 400);
  }

  const lookup = await makeLookup(password, context.env.ROOM_PASSWORD_SECRET);
  const order = await context.env.DB.prepare(`
    SELECT public_token FROM vault_orders WHERE password_lookup = ?
  `).bind(lookup).first();

  if (!order) return json({ error: 'That password does not match a private order.' }, 404);
  return json({ token: order.public_token });
}
