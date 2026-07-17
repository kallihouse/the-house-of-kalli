const respond = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const TYPES = new Set(['income', 'expense']), STATUSES = new Set(['cleared', 'pending']);
const clean = (value, limit = 1000) => String(value ?? '').trim().slice(0, limit);
const integer = value => Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const validId = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const transactionFrom = body => {
  const item = { transaction_type: TYPES.has(body.transaction_type) ? body.transaction_type : 'expense', amount_cents: integer(body.amount_cents), category: clean(body.category, 80), description: clean(body.description, 180), transaction_date: clean(body.transaction_date, 10), payment_method: clean(body.payment_method, 80), status: STATUSES.has(body.status) ? body.status : 'cleared', notes: clean(body.notes, 3000) };
  if (!item.amount_cents) throw new Error('Please enter an amount greater than zero.');
  if (!item.category) throw new Error('Please choose or enter a category.');
  if (!item.description) throw new Error('Please enter a short description.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date)) throw new Error('Please choose the transaction date.');
  return item;
};
export async function onRequestGet({ env }) { try { const result = await env.DB.prepare('SELECT * FROM office_finances ORDER BY transaction_date DESC, id DESC').all(); return respond({ transactions: result.results || [] }); } catch { return respond({ error: 'The Ledger could not be opened. Run its database setup once, then try again.' }, 500); } }
export async function onRequestPost({ request, env }) { try { const t=transactionFrom(await request.json()); const result=await env.DB.prepare(`INSERT INTO office_finances (transaction_type,amount_cents,category,description,transaction_date,payment_method,status,notes) VALUES (?,?,?,?,?,?,?,?)`).bind(t.transaction_type,t.amount_cents,t.category,t.description,t.transaction_date,t.payment_method,t.status,t.notes).run(); return respond({ok:true,id:result.meta?.last_row_id},201); } catch(error){return respond({error:error.message||'The transaction could not be saved.'},400)} }
export async function onRequestPatch({ request, env }) { try { const body=await request.json(),id=validId(body.id); if(!id)throw new Error('That transaction could not be found.'); const t=transactionFrom(body); await env.DB.prepare(`UPDATE office_finances SET transaction_type=?,amount_cents=?,category=?,description=?,transaction_date=?,payment_method=?,status=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(t.transaction_type,t.amount_cents,t.category,t.description,t.transaction_date,t.payment_method,t.status,t.notes,id).run(); return respond({ok:true}); } catch(error){return respond({error:error.message||'The transaction could not be updated.'},400)} }
export async function onRequestDelete({ request, env }) { try { const id=validId(new URL(request.url).searchParams.get('id')); if(!id)throw new Error('That transaction could not be found.'); await env.DB.prepare('DELETE FROM office_finances WHERE id=?').bind(id).run(); return respond({ok:true}); } catch(error){return respond({error:error.message||'The transaction could not be removed.'},400)} }
