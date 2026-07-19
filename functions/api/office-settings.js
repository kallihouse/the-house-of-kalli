const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
const bool=value=>value===true||value===1||value==='1';
const money=value=>Math.max(0,Math.min(10000000,Math.round(Number(value)||0)));
const rowSql=`SELECT house_name,host_name,contact_email,payid_enabled,payid_value,payid_name,
 paypal_enabled,paypal_url,default_payment_method,custom_rating_cents,custom_video_min_cents,
 custom_video_max_cents,custom_story_cents,custom_narrated_cents,custom_kink_cents,updated_at
 FROM house_settings WHERE id=1`;

async function readSettings(env){
  let row=await env.DB.prepare(rowSql).first();
  if(!row){await env.DB.prepare('INSERT OR IGNORE INTO house_settings (id) VALUES (1)').run();row=await env.DB.prepare(rowSql).first();}
  return {
    ...row,
    payid_enabled:Boolean(row.payid_enabled),
    paypal_enabled:Boolean(row.paypal_enabled),
    payid_value:row.payid_value||env.PAYID_VALUE||'',
    payid_name:row.payid_name||env.PAYID_NAME||'',
    office_password_configured:Boolean(env.VAULT_ADMIN_SECRET),
  };
}

export async function onRequestGet({env}){
  if(!env.DB)return reply({error:'Settings are not connected yet.'},503);
  try{
    const [settings,push]=await Promise.all([
      readSettings(env),
      env.DB.prepare('SELECT COUNT(*) AS total FROM office_push_subscriptions').first().catch(()=>({total:0})),
    ]);
    return reply({settings,push_devices:Number(push?.total||0)});
  }catch(error){return reply({error:error.message||'Settings could not be opened.'},500)}
}

export async function onRequestPatch({request,env}){
  if(!env.DB)return reply({error:'Settings are not connected yet.'},503);
  let body;try{body=await request.json();}catch{return reply({error:'Please check the settings and try again.'},400)}
  const data={
    house_name:clean(body.house_name,100)||'The House of Kalli',host_name:clean(body.host_name,80)||'Kalli',
    contact_email:clean(body.contact_email,200),payid_enabled:bool(body.payid_enabled),payid_value:clean(body.payid_value,200),
    payid_name:clean(body.payid_name,120),paypal_enabled:bool(body.paypal_enabled),paypal_url:clean(body.paypal_url,500),
    default_payment_method:['payid','paypal'].includes(body.default_payment_method)?body.default_payment_method:'payid',
    custom_rating_cents:money(body.custom_rating_cents),custom_video_min_cents:money(body.custom_video_min_cents),
    custom_video_max_cents:money(body.custom_video_max_cents),custom_story_cents:money(body.custom_story_cents),
    custom_narrated_cents:money(body.custom_narrated_cents),custom_kink_cents:money(body.custom_kink_cents),
  };
  if(data.contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email))return reply({error:'Please enter a valid House email address.'},400);
  if(data.payid_enabled&&(!data.payid_value||!data.payid_name))return reply({error:'Add both the PayID and PayID name, or switch PayID off.'},400);
  if(data.paypal_enabled){try{const url=new URL(data.paypal_url);if(url.protocol!=='https:')throw Error();}catch{return reply({error:'Please enter the full secure PayPal payment link beginning with https://.'},400)}}
  if(data.default_payment_method==='paypal'&&!data.paypal_enabled)return reply({error:'Switch PayPal on before making it the preferred method.'},400);
  if(data.default_payment_method==='payid'&&!data.payid_enabled)return reply({error:'Switch PayID on before making it the preferred method.'},400);
  if(data.custom_video_max_cents<data.custom_video_min_cents)return reply({error:'The personalised-video maximum must be at least the minimum.'},400);
  try{
    await env.DB.prepare(`INSERT INTO house_settings (id,house_name,host_name,contact_email,payid_enabled,payid_value,payid_name,
      paypal_enabled,paypal_url,default_payment_method,custom_rating_cents,custom_video_min_cents,custom_video_max_cents,
      custom_story_cents,custom_narrated_cents,custom_kink_cents,updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET house_name=excluded.house_name,host_name=excluded.host_name,contact_email=excluded.contact_email,
      payid_enabled=excluded.payid_enabled,payid_value=excluded.payid_value,payid_name=excluded.payid_name,paypal_enabled=excluded.paypal_enabled,
      paypal_url=excluded.paypal_url,default_payment_method=excluded.default_payment_method,custom_rating_cents=excluded.custom_rating_cents,
      custom_video_min_cents=excluded.custom_video_min_cents,custom_video_max_cents=excluded.custom_video_max_cents,
      custom_story_cents=excluded.custom_story_cents,custom_narrated_cents=excluded.custom_narrated_cents,custom_kink_cents=excluded.custom_kink_cents,
      updated_at=CURRENT_TIMESTAMP`).bind(data.house_name,data.host_name,data.contact_email,data.payid_enabled?1:0,data.payid_value,data.payid_name,
      data.paypal_enabled?1:0,data.paypal_url,data.default_payment_method,data.custom_rating_cents,data.custom_video_min_cents,
      data.custom_video_max_cents,data.custom_story_cents,data.custom_narrated_cents,data.custom_kink_cents).run();
    return reply({ok:true,settings:await readSettings(env)});
  }catch(error){return reply({error:error.message||'Settings could not be saved.'},500)}
}
