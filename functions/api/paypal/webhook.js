import{configured,paypalFetch,verifyWebhook,captureFromOrder,markVaultOrderPaid}from'../../lib/paypal.js';
import{sendHousePush}from'../../lib/push.js';
const text=(value,status=200)=>new Response(value,{status,headers:{'Cache-Control':'no-store','Content-Type':'text/plain;charset=utf-8'}});
const orderFor=async(env,paypalOrderId,reference='')=>env.DB.prepare(`SELECT id,order_reference,product_name,amount_cents,status,paypal_order_id FROM vault_orders WHERE paypal_order_id=? OR (?<>'' AND order_reference=?) LIMIT 1`).bind(paypalOrderId,reference,reference).first();

export async function onRequestPost({request,env}){
  if(!env.DB||!configured(env)||!env.PAYPAL_WEBHOOK_ID)return text('Not configured',503);
  let event;try{event=await request.json();}catch{return text('Invalid payload',400)}
  if(!await verifyWebhook(env,request,event))return text('Invalid signature',401);
  const eventId=String(event.id||'');if(!eventId)return text('Missing event id',400);
  const seen=await env.DB.prepare('SELECT event_id FROM paypal_webhook_events WHERE event_id=?').bind(eventId).first();if(seen)return text('Already processed');
  try{
    if(event.event_type==='CHECKOUT.ORDER.APPROVED'){
      const paypalOrderId=String(event.resource?.id||''),reference=String(event.resource?.purchase_units?.[0]?.custom_id||'');
      const order=await orderFor(env,paypalOrderId,reference);if(order&&order.status==='awaiting_payment'){
        const captured=await paypalFetch(env,`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,{method:'POST',headers:{'PayPal-Request-Id':`webhook-capture-${order.id}`},body:'{}'});
        const capture=captureFromOrder(captured.data);if(capture){await markVaultOrderPaid(env,order,capture);await sendHousePush(env,{title:'The House Office',body:`PayPal payment confirmed for ${order.order_reference}.`,url:'/orders',tag:`payment-${order.id}`});}
      }
    }
    if(event.event_type==='PAYMENT.CAPTURE.COMPLETED'){
      const capture=event.resource||{},reference=String(capture.custom_id||capture.invoice_id||''),paypalOrderId=String(capture.supplementary_data?.related_ids?.order_id||'');
      const order=await orderFor(env,paypalOrderId,reference);if(order){const wasAwaiting=order.status==='awaiting_payment';await markVaultOrderPaid(env,order,capture);if(wasAwaiting)await sendHousePush(env,{title:'The House Office',body:`PayPal payment confirmed for ${order.order_reference}.`,url:'/orders',tag:`payment-${order.id}`});}
    }
    await env.DB.prepare(`INSERT OR IGNORE INTO paypal_webhook_events(event_id,event_type,paypal_resource_id) VALUES(?,?,?)`).bind(eventId,String(event.event_type||''),String(event.resource?.id||'')).run();
    return text('OK');
  }catch(error){console.error('paypal_webhook_failed',error);return text('Processing failed',500)}
}
