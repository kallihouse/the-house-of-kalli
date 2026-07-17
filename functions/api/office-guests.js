const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

const clean = (value, limit = 500) => String(value ?? '').trim().slice(0, limit);

const normaliseTags = (value) => {
  const input = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(input.map((tag) => clean(tag, 30)).filter(Boolean))].slice(0, 12);
};

const guestPayload = (body) => {
  const displayName = clean(body.display_name, 80);
  if (!displayName) throw new Error('A guest name or private alias is required.');
  const method = ['none', 'email', 'sms', 'whatsapp'].includes(body.contact_method)
    ? body.contact_method : 'none';
  return {
    displayName,
    contactValue: clean(body.contact_value, 150),
    contactMethod: method,
    birthday: clean(body.birthday, 10),
    notes: clean(body.notes, 3000),
    tags: JSON.stringify(normaliseTags(body.tags)),
    privateCollection: body.private_collection ? 1 : 0,
  };
};

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ error: 'Guest records are not configured.' }, 503);
  const result = await context.env.DB.prepare(`
    SELECT id, display_name, contact_value, contact_method, birthday, notes, tags,
           private_collection, lifetime_spend_cents, visit_count, collection_count,
           created_at, updated_at
    FROM office_guests
    ORDER BY updated_at DESC, id DESC
    LIMIT 500
  `).all();
  return json({ guests: result.results || [] });
}

export async function onRequestPost(context) {
  if (!context.env.DB) return json({ error: 'Guest records are not configured.' }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  let guest;
  try { guest = guestPayload(body); } catch (error) { return json({ error: error.message }, 400); }

  const result = await context.env.DB.prepare(`
    INSERT INTO office_guests
      (display_name, contact_value, contact_method, birthday, notes, tags, private_collection)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    guest.displayName, guest.contactValue, guest.contactMethod, guest.birthday,
    guest.notes, guest.tags, guest.privateCollection,
  ).run();
  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}

export async function onRequestPatch(context) {
  if (!context.env.DB) return json({ error: 'Guest records are not configured.' }, 503);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: 'Invalid guest.' }, 400);
  let guest;
  try { guest = guestPayload(body); } catch (error) { return json({ error: error.message }, 400); }

  const result = await context.env.DB.prepare(`
    UPDATE office_guests SET
      display_name = ?, contact_value = ?, contact_method = ?, birthday = ?,
      notes = ?, tags = ?, private_collection = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    guest.displayName, guest.contactValue, guest.contactMethod, guest.birthday,
    guest.notes, guest.tags, guest.privateCollection, id,
  ).run();
  if (!result.meta?.changes) return json({ error: 'Guest not found.' }, 404);
  return json({ ok: true });
}
