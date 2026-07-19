const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
export async function onRequestGet({env}){
  if(!env.DB)return reply({error:'House details are unavailable.'},503);
  try{
    const row=await env.DB.prepare(`SELECT house_name,custom_rating_cents,custom_video_min_cents,custom_video_max_cents,
      custom_story_cents,custom_narrated_cents,custom_kink_cents FROM house_settings WHERE id=1`).first();
    return reply(row||{house_name:'The House of Kalli',custom_rating_cents:15000,custom_video_min_cents:25000,
      custom_video_max_cents:30000,custom_story_cents:15000,custom_narrated_cents:25000,custom_kink_cents:35000});
  }catch{return reply({error:'House details are unavailable.'},503)}
}
