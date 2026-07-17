const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const makeLookup = async (value, secret) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function onRequestPost(context) {
  if (!context.env.DB || !context.env.ROOM_PASSWORD_SECRET) {
    return json({ error: 'Private waiting-room passwords are not connected yet.' }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const password = String(body.private_password ?? '').normalize('NFKC');
  if (password.length < 8 || password.length > 128) {
    return json({ error: 'Please enter your private password.' }, 400);
  }

  const now = Date.now();
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const fingerprint = await makeLookup(`access:${ip}`, context.env.ROOM_PASSWORD_SECRET);
  const attempt = await context.env.DB.prepare(`
    SELECT attempts, window_started_at, locked_until
    FROM room_access_attempts
    WHERE fingerprint = ?
  `).bind(fingerprint).first();

  if (attempt?.locked_until && Date.parse(attempt.locked_until) > now) {
    return json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, 429);
  }

  const passwordLookup = await makeLookup(password, context.env.ROOM_PASSWORD_SECRET);
  const room = await context.env.DB.prepare(`
    SELECT public_token
    FROM booking_requests
    WHERE password_lookup = ?
  `).bind(passwordLookup).first();

  if (!room) {
    const windowStarted = attempt?.window_started_at ? Date.parse(attempt.window_started_at) : 0;
    const sameWindow = Number.isFinite(windowStarted) && now - windowStarted < 15 * 60 * 1000;
    const attempts = sameWindow ? Number(attempt?.attempts || 0) + 1 : 1;
    const lockedUntil = attempts >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;

    await context.env.DB.prepare(`
      INSERT INTO room_access_attempts (fingerprint, attempts, window_started_at, locked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET
        attempts = excluded.attempts,
        window_started_at = excluded.window_started_at,
        locked_until = excluded.locked_until
    `).bind(
      fingerprint,
      attempts,
      sameWindow && attempt?.window_started_at ? attempt.window_started_at : new Date(now).toISOString(),
      lockedUntil
    ).run();

    return json({ error: 'That private password does not match a waiting room.' }, 404);
  }

  await context.env.DB.prepare(`DELETE FROM room_access_attempts WHERE fingerprint = ?`)
    .bind(fingerprint).run();
  return json({ token: room.public_token });
}
