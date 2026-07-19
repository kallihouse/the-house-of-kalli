import{configured,paypalFetch,captureFromOrder,markVaultOrderPaid}from'../../lib/paypal.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequestPost({request,env}){
  if(!env.DB||!configured(env))return reply({error:'PayPal automatic payments are not connected yet.'},503);
  let body;try{body=await request.json();}catch{return reply({error:'That PayPal return was not recognised.'},400)}
  const token=String(body.token||'');if(!/^[A-Za-z0-9_-]{40,50}$/.test(token))return reply({error:'Private order not found.'},404);
  const order=await env.DB.prepare(`SELECT id,public_token,order_reference,product_name,amount_cents,status,paypal_order_id FROM vault_orders WHERE public_token=?`).bind(token).first();
  if(!order)return reply({error:'Private order not found.'},404);if(order.status==='paid')return reply({paid:true});if(!order.paypal_order_id)return reply({error:'No PayPal payment was found for this order.'},409);
  let result=await paypalFetch(env,`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}/capture`,{method:'POST',headers:{'PayPal-Request-Id':`capture-${order.id}`},body:'{}'});
  let capture=captureFromOrder(result.data);
  if(!capture&&[409,422].includes(result.response.status)){result=await paypalFetch(env,`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);capture=captureFromOrder(result.data);}
  if(!capture)return reply({error:result.data.message||'PayPal has not completed this payment yet.'},409);
  await markVaultOrderPaid(env,order,capture);return reply({paid:true});
}
