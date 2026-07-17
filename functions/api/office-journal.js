const respond = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const STATUSES = new Set(['draft', 'scheduled', 'published', 'archived']);
const AUDIENCES = new Set(['public', 'collectors']);
const clean = (value, limit = 1000) => String(value ?? '').trim().slice(0, limit);
const idFrom = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const slugify = value => clean(value, 160).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

const entryFrom = body => {
  const entry = {
    title: clean(body.title, 180), slug: slugify(body.slug || body.title),
    excerpt: clean(body.excerpt, 500), body: clean(body.body, 30000),
    category: clean(body.category, 80) || 'From the House',
    audience: AUDIENCES.has(body.audience) ? body.audience : 'public',
    status: STATUSES.has(body.status) ? body.status : 'draft',
    publish_at: clean(body.publish_at, 19) || null,
  };
  if (!entry.title) throw new Error('Please give this Journal entry a title.');
  if (!entry.body) throw new Error('The page is still blank.');
  if (!entry.slug) throw new Error('The title needs at least one letter or number.');
  if (entry.status === 'scheduled' && !entry.publish_at) throw new Error('Please choose when this entry should be published.');
  if (entry.status === 'published' && !entry.publish_at) entry.publish_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return entry;
};

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare('SELECT * FROM office_journal ORDER BY COALESCE(publish_at, created_at) DESC, id DESC').all();
    return respond({ entries: result.results || [] });
  } catch { return respond({ error: 'The Journal could not be opened. Run its database setup once, then try again.' }, 500); }
}

export async function onRequestPost({ request, env }) {
  try {
    const entry = entryFrom(await request.json());
    const result = await env.DB.prepare(`INSERT INTO office_journal (title, slug, excerpt, body, category, audience, status, publish_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(entry.title, entry.slug, entry.excerpt, entry.body, entry.category, entry.audience, entry.status, entry.publish_at).run();
    return respond({ ok: true, id: result.meta?.last_row_id }, 201);
  } catch (error) {
    const message = String(error.message || '').includes('UNIQUE') ? 'That title or web address is already being used.' : error.message;
    return respond({ error: message || 'The entry could not be saved.' }, 400);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const body = await request.json(), id = idFrom(body.id);
    if (!id) throw new Error('That Journal entry could not be found.');
    if (body.status && Object.keys(body).every(key => ['id', 'status'].includes(key))) {
      if (!STATUSES.has(body.status)) throw new Error('That status is not available.');
      await env.DB.prepare('UPDATE office_journal SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.status, id).run();
    } else {
      const entry = entryFrom(body);
      await env.DB.prepare(`UPDATE office_journal SET title=?, slug=?, excerpt=?, body=?, category=?, audience=?, status=?, publish_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(entry.title, entry.slug, entry.excerpt, entry.body, entry.category, entry.audience, entry.status, entry.publish_at, id).run();
    }
    return respond({ ok: true });
  } catch (error) {
    const message = String(error.message || '').includes('UNIQUE') ? 'That title or web address is already being used.' : error.message;
    return respond({ error: message || 'The entry could not be updated.' }, 400);
  }
}
