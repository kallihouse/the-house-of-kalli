const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const PUBLIC_KEY='BFU8uZBTRC7SyjQHeSMTwfF82XzYDVqZMdRvsyvAXBMP38iSsijhTADETsmv8qEbzr_hW2Ki9qCvluOm3KcKClE';
const validEndpoint=value=>{try{return new URL(value).protocol==='https:'}catch{return false}};

export async function onRequestGet({env}){
  try{
    const row=await env.DB.prepare('SELECT COUNT(*) AS total FROM office_push_subscriptions').first();
    return reply({ok:true,subscriptions:Number(row?.total||0),publicKey:PUBLIC_KEY});
  }catch{return reply({error:'Notifications have not been connected yet.'},503)}
}

export async function onRequestPost({request,env}){
  try{
    const body=await request.json(),subscription=body.subscription||body;
    const endpoint=String(subscription.endpoint||''),p256dh=String(subscription.keys?.p256dh||''),auth=String(subscription.keys?.auth||'');
    if(!validEndpoint(endpoint)||!p256dh||!auth)return reply({error:'That notification subscription is not valid.'},400);
    await env.DB.prepare(`INSERT INTO office_push_subscriptions(endpoint,p256dh,auth)
      VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,updated_at=CURRENT_TIMESTAMP`)
      .bind(endpoint,p256dh,auth).run();
    return reply({ok:true},201);
  }catch(error){return reply({error:error.message||'Notifications could not be enabled.'},400)}
}

export async function onRequestDelete({request,env}){
  try{
    const body=await request.json(),endpoint=String(body.endpoint||'');
    if(endpoint)await env.DB.prepare('DELETE FROM office_push_subscriptions WHERE endpoint=?').bind(endpoint).run();
    return reply({ok:true});
  }catch{return reply({error:'Notifications could not be disabled.'},400)}
}
