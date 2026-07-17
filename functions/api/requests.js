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

  const token = makeToken();

  try {
    await context.env.DB.prepare(`
      INSERT INTO booking_requests (
        public_token, name, age, phone, contact_preference, experience,
        connection, preferred_date, preferred_time, duration, location,
        notes, rates_read, deposit_agreed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      token, request.name, request.age, request.phone, request.contactPreference,
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
