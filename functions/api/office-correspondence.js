const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const CHANNELS = new Set(['private', 'email', 'sms', 'whatsapp']);
const DIRECTIONS = new Set(['incoming', 'outgoing']);
const STATUSES = new Set(['unread', 'read', 'draft', 'sent', 'archived']);
const clean = (value, limit = 1000) => String(value ?? '').trim().slice(0, limit);
const int = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

const messageFrom = body => {
  const message = {
    guest_id: int(body.guest_id), guest_name: clean(body.guest_name, 120),
    contact_value: clean(body.contact_value, 240),
    channel: CHANNELS.has(body.channel) ? body.channel : 'private',
    direction: DIRECTIONS.has(body.direction) ? body.direction : 'incoming',
    subject: clean(body.subject, 180), body: clean(body.body, 8000),
    status: STATUSES.has(body.status) ? body.status : 'unread',
    occurred_at: clean(body.occurred_at, 19) || new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
  if (!message.guest_name) throw new Error('Please choose a guest or enter a private alias.');
  if (!message.body) throw new Error('Please enter the message.');
  if (message.channel !== 'private' && !message.contact_value) throw new Error('Please enter the email address or mobile number.');
  return message;
};

export async function onRequestGet({ env }) {
  try {
    const [messages, guests] = await Promise.all([
      env.DB.prepare(`SELECT c.*, COALESCE(g.display_name, c.guest_name) AS display_name
        FROM office_correspondence c LEFT JOIN office_guests g ON g.id = c.guest_id
        ORDER BY c.occurred_at DESC, c.id DESC`).all(),
      env.DB.prepare('SELECT id, display_name, contact_value, contact_method FROM office_guests ORDER BY display_name COLLATE NOCASE').all(),
    ]);
    return reply({ messages: messages.results || [], guests: guests.results || [] });
  } catch {
    return reply({ error: 'Correspondence could not be opened. Run its database setup once, then try again.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const message = messageFrom(await request.json());
    const result = await env.DB.prepare(`INSERT INTO office_correspondence
      (guest_id, guest_name, contact_value, channel, direction, subject, body, status, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(message.guest_id, message.guest_name, message.contact_value, message.channel, message.direction, message.subject, message.body, message.status, message.occurred_at).run();
    return reply({ ok: true, id: result.meta?.last_row_id }, 201);
  } catch (error) { return reply({ error: error.message || 'The message could not be saved.' }, 400); }
}

export async function onRequestPatch({ request, env }) {
  try {
    const body = await request.json();
    const id = int(body.id);
    if (!id) throw new Error('That message could not be found.');
    if (body.status && Object.keys(body).every(key => ['id', 'status'].includes(key))) {
      if (!STATUSES.has(body.status)) throw new Error('That status is not available.');
      await env.DB.prepare('UPDATE office_correspondence SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.status, id).run();
    } else {
      const message = messageFrom(body);
      await env.DB.prepare(`UPDATE office_correspondence SET guest_id=?, guest_name=?, contact_value=?, channel=?, direction=?, subject=?, body=?, status=?, occurred_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(message.guest_id, message.guest_name, message.contact_value, message.channel, message.direction, message.subject, message.body, message.status, message.occurred_at, id).run();
    }
    return reply({ ok: true });
  } catch (error) { return reply({ error: error.message || 'The message could not be updated.' }, 400); }
}
