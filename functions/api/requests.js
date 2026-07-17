const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);

const makeToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const makePasswordLookup = async (password, secret) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(password.normalize('NFKC')));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ error: 'The booking system is not connected yet.' }, 503);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const request = {
    name: clean(body.name, 100),
    age: Number(body.age),
    phone: clean(body.phone, 40),
    contactPreference: clean(body.contact_preference, 40),
    experience: clean(body.experience),
    connection: clean(body.connection),
    date: clean(body.date, 20),
    time: clean(body.time, 20),
    duration: clean(body.duration, 40),
    location: clean(body.location, 40),
    notes: clean(body.notes),
    ratesRead: body.rates_read === true,
    depositAgreed: body.deposit_agreed === true,
    privatePassword: String(body.private_password ?? ''),
    privatePasswordConfirm: String(body.private_password_confirm ?? ''),
  };

  if (!request.name || !Number.isInteger(request.age) || request.age < 18 ||
      !request.contactPreference || !request.experience || !request.connection ||
      !request.date || !request.time || !request.duration || !request.location ||
      !request.ratesRead || !request.depositAgreed) {
    return json({ error: 'Please complete every required field.' }, 400);
  }

  if (request.contactPreference === 'text_me' && !request.phone) {
    return json({ error: 'Please add your mobile number or choose the private waiting room.' }, 400);
  }

  const usesWaitingRoom = request.contactPreference === 'private_house_reply';
  if (usesWaitingRoom && (request.privatePassword.length < 8 || request.privatePassword.length > 128)) {
    return json({ error: 'Your private password must be at least 8 characters.' }, 400);
  }

  if (usesWaitingRoom && request.privatePassword !== request.privatePasswordConfirm) {
    return json({ error: 'Your private passwords do not match.' }, 400);
  }

  if (usesWaitingRoom && !context.env.ROOM_PASSWORD_SECRET) {
    return json({ error: 'Private waiting-room passwords are not connected yet.' }, 503);
  }

  const token = makeToken();
  const passwordLookup = usesWaitingRoom
    ? await makePasswordLookup(request.privatePassword, context.env.ROOM_PASSWORD_SECRET)
    : null;

  if (passwordLookup) {
    const existingRoom = await context.env.DB.prepare(`
      SELECT id FROM booking_requests WHERE password_lookup = ?
    `).bind(passwordLookup).first();
    if (existingRoom) {
      return json({ error: 'That private password is already in use. Please choose another.' }, 409);
    }
  }

  try {
    await context.env.DB.prepare(`
      INSERT INTO booking_requests (
        public_token, password_lookup, name, age, phone, contact_preference, experience,
        connection, preferred_date, preferred_time, duration, location,
        notes, rates_read, deposit_agreed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      token, passwordLookup, request.name, request.age, request.phone, request.contactPreference,
      request.experience, request.connection, request.date, request.time,
      request.duration, request.location, request.notes,
      request.ratesRead ? 1 : 0, request.depositAgreed ? 1 : 0
    ).run();
  } catch (error) {
    console.error('booking_request_insert_failed', error);
    return json({ error: 'Your request could not be saved. Please try again.' }, 500);
  }

  return json({ token }, 201);
}
