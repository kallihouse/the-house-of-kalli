const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const STATUSES = new Set(['enquiry', 'confirmed', 'completed', 'cancelled']);
const DEPOSITS = new Set(['not_required', 'outstanding', 'paid']);

const clean = (value, limit = 500) => String(value ?? '').trim().slice(0, limit);
const integer = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const visitFrom = (body) => {
  const visit = {
    guest_id: body.guest_id ? integer(body.guest_id, 0) || null : null,
    guest_name: clean(body.guest_name, 120),
    visit_date: clean(body.visit_date, 10),
    start_time: clean(body.start_time, 5),
    duration_minutes: Math.min(integer(body.duration_minutes, 60), 1440),
    location: clean(body.location, 180),
    status: STATUSES.has(body.status) ? body.status : 'enquiry',
    fee_cents: integer(body.fee_cents),
    deposit_cents: integer(body.deposit_cents),
    deposit_status: DEPOSITS.has(body.deposit_status) ? body.deposit_status : 'not_required',
    notes: clean(body.notes, 4000),
  };
  if (!visit.guest_name) throw new Error('Please enter a guest name or alias.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.visit_date)) throw new Error('Please choose a visit date.');
  if (!/^\d{2}:\d{2}$/.test(visit.start_time)) throw new Error('Please choose a start time.');
  if (!visit.duration_minutes) throw new Error('Please enter the visit duration.');
  return visit;
};

export async function onRequestGet({ env }) {
  try {
    const [visits, guests] = await Promise.all([
      env.DB.prepare(`SELECT v.*, COALESCE(g.display_name, v.guest_name) AS display_name
        FROM office_visits v LEFT JOIN office_guests g ON g.id = v.guest_id
        ORDER BY v.visit_date DESC, v.start_time DESC`).all(),
      env.DB.prepare('SELECT id, display_name FROM office_guests ORDER BY display_name COLLATE NOCASE').all(),
    ]);
    return json({ visits: visits.results || [], guests: guests.results || [] });
  } catch (error) {
    return json({ error: 'Visits could not be opened. Run the Visits database setup once, then try again.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const visit = visitFrom(await request.json());
    const result = await env.DB.prepare(`INSERT INTO office_visits
      (guest_id, guest_name, visit_date, start_time, duration_minutes, location, status, fee_cents, deposit_cents, deposit_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(visit.guest_id, visit.guest_name, visit.visit_date, visit.start_time, visit.duration_minutes, visit.location, visit.status, visit.fee_cents, visit.deposit_cents, visit.deposit_status, visit.notes).run();
    return json({ ok: true, id: result.meta?.last_row_id }, 201);
  } catch (error) {
    return json({ error: error.message || 'The visit could not be saved.' }, 400);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const body = await request.json();
    const id = integer(body.id);
    if (!id) throw new Error('That visit could not be found.');
    const visit = visitFrom(body);
    await env.DB.prepare(`UPDATE office_visits SET guest_id = ?, guest_name = ?, visit_date = ?, start_time = ?,
      duration_minutes = ?, location = ?, status = ?, fee_cents = ?, deposit_cents = ?, deposit_status = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(visit.guest_id, visit.guest_name, visit.visit_date, visit.start_time, visit.duration_minutes, visit.location, visit.status, visit.fee_cents, visit.deposit_cents, visit.deposit_status, visit.notes, id).run();
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || 'The visit could not be updated.' }, 400);
  }
}
