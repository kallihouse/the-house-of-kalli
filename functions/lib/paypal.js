const jsonHeaders={'Content-Type':'application/json','Accept':'application/json'};
export const configured=env=>Boolean(env.PAYPAL_CLIENT_ID&&env.PAYPAL_CLIENT_SECRET);
export const baseUrl=env=>String(env.PAYPAL_ENVIRONMENT||'live').toLowerCase()==='sandbox'
  ?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';

export async function accessToken(env){
  if(!configured(env))throw new Error('PayPal automatic payments have not been connected yet.');
  const credentials=btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const response=await fetch(`${baseUrl(env)}/v1/oauth2/token`,{method:'POST',headers:{Authorization:`Basic ${credentials}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  const data=await response.json();
  if(!response.ok||!data.access_token)throw new Error(data.error_description||'PayPal could not be reached.');
  return data.access_token;
}

export async function paypalFetch(env,path,options={}){
  const token=await accessToken(env);
  const response=await fetch(`${baseUrl(env)}${path}`,{...options,headers:{...jsonHeaders,Authorization:`Bearer ${token}`,...(options.headers||{})}});
  let data={};try{data=await response.json();}catch{}
  return {response,data};
}

export async function verifyWebhook(env,request,event){
  if(!env.PAYPAL_WEBHOOK_ID)throw new Error('The PayPal webhook has not been connected yet.');
  const payload={
    auth_algo:request.headers.get('paypal-auth-algo')||'',
    cert_url:request.headers.get('paypal-cert-url')||'',
    transmission_id:request.headers.get('paypal-transmission-id')||'',
    transmission_sig:request.headers.get('paypal-transmission-sig')||'',
    transmission_time:request.headers.get('paypal-transmission-time')||'',
    webhook_id:env.PAYPAL_WEBHOOK_ID,
    webhook_event:event,
  };
  if(Object.values(payload).some(value=>!value))return false;
  const {response,data}=await paypalFetch(env,'/v1/notifications/verify-webhook-signature',{method:'POST',body:JSON.stringify(payload)});
  return response.ok&&data.verification_status==='SUCCESS';
}

const cents=value=>Math.round(Number(value||0)*100);
const sydneyDate=()=>{
  const parts=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=type=>parts.find(item=>item.type===type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export async function markVaultOrderPaid(env,order,capture){
  const amount=capture?.amount||capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
  const captureId=capture?.id||capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id||'';
  if(!captureId||capture?.status&&capture.status!=='COMPLETED')throw new Error('PayPal has not completed this payment.');
  if(amount?.currency_code!=='AUD'||cents(amount?.value)!==Number(order.amount_cents))throw new Error('PayPal payment details did not match the House order.');
  const update=env.DB.prepare(`UPDATE vault_orders SET status='paid',paypal_capture_id=?,payment_method='paypal',paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_payment'`).bind(captureId,order.id);
  const ledger=env.DB.prepare(`INSERT OR IGNORE INTO office_finances (transaction_type,amount_cents,category,description,transaction_date,payment_method,status,notes,source_type,source_id) VALUES ('income',?,?,?,?,?,'cleared',?,'vault_order',?)`).bind(Number(order.amount_cents),'Vault sales',`Vault sale — ${order.product_name}`,sydneyDate(),'PayPal',`PayPal capture ${captureId} · Order ${order.order_reference}`,String(order.id));
  await env.DB.batch([update,ledger]);
  return captureId;
}

export const captureFromOrder=paypalOrder=>paypalOrder?.purchase_units?.[0]?.payments?.captures?.find(item=>item.status==='COMPLETED')||null;
