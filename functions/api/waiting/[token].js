const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

export async function onRequestGet(context) {
  if (!context.env.DB) return json({ error: 'The waiting room is not connected yet.' }, 503);

  const token = String(context.params.token || '');
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return json({ error: 'Waiting room not found.' }, 404);

  const request = await context.env.DB.prepare(`
    SELECT id, name, status, created_at
    FROM booking_requests
    WHERE public_token = ?
  `).bind(token).first();

  if (!request) return json({ error: 'Waiting room not found.' }, 404);

  const messages = request.status === 'approved'
    ? await context.env.DB.prepare(`
        SELECT sender, body, created_at
        FROM messages
        WHERE request_id = ?
        ORDER BY id ASC
      `).bind(request.id).all()
    : { results: [] };

  return json({
    name: request.name,
    status: request.status,
    created_at: request.created_at,
    messages: messages.results || [],
    can_reply: request.status === 'approved' && (messages.results || []).some((message) => message.sender === 'kalli'),
  });
}
