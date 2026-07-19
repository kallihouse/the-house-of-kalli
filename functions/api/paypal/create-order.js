import{configured,paypalFetch,captureFromOrder,markVaultOrderPaid}from'../../lib/paypal.js';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const validToken=value=>/^[A-Za-z0-9_-]{40,50}$/.test(String(value||''));
const amount=cents=>(Number(cents||0)/100).toFixed(2);

export async function onRequestPost({request,env}){
  if(!env.DB||!configured(env))return reply({error:'PayPal automatic payments are not connected yet.'},503);
  let body;try{body=await request.json();}catch{return reply({error:'That PayPal request was not recognised.'},400)}
  const token=String(body.token||'');if(!validToken(token))return reply({error:'Private order not found.'},404);
  const order=await env.DB.prepare(`SELECT id,public_token,order_reference,product_name,amount_cents,status,paypal_order_id FROM vault_orders WHERE public_token=?`).bind(token).first();
  if(!order)return reply({error:'Private order not found.'},404);
  if(order.status==='paid')return reply({paid:true});
  if(order.status!=='awaiting_payment')return reply({error:'This order is not available for payment.'},409);
  if(order.paypal_order_id){
    const current=await paypalFetch(env,`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}`);
    if(current.response.ok){
      const capture=captureFromOrder(current.data);if(capture){await markVaultOrderPaid(env,order,capture);return reply({paid:true})}
      const approval=current.data.links?.find(link=>link.rel==='approve')?.href;
      if(approval&&['CREATED','SAVED','APPROVED'].includes(current.data.status))return reply({approval_url:approval});
    }
  }
  const origin=new URL(request.url).origin;
  const payload={intent:'CAPTURE',purchase_units:[{custom_id:order.order_reference,description:String(order.product_name).slice(0,127),amount:{currency_code:'AUD',value:amount(order.amount_cents)}}],payment_source:{paypal:{experience_context:{brand_name:'The House of Kalli',shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:`${origin}/vault-order.html?token=${encodeURIComponent(token)}&paypal=approved`,cancel_url:`${origin}/vault-order.html?token=${encodeURIComponent(token)}&paypal=cancelled`}}}};
  const created=await paypalFetch(env,'/v2/checkout/orders',{method:'POST',headers:{'PayPal-Request-Id':`house-${order.id}-${Date.now()}`},body:JSON.stringify(payload)});
  if(!created.response.ok)return reply({error:created.data.message||'PayPal could not begin this payment.'},502);
  const approval=created.data.links?.find(link=>link.rel==='payer-action'||link.rel==='approve')?.href;
  if(!created.data.id||!approval)return reply({error:'PayPal did not return a payment page.'},502);
  await env.DB.prepare(`UPDATE vault_orders SET paypal_order_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(created.data.id,order.id).run();
  return reply({approval_url:approval});
}
