(()=>{
const money=cents=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(cents||0)/100);
fetch('/api/house-config').then(r=>r.ok?r.json():null).then(c=>{
  if(!c)return;
  const set=(value,text)=>{const small=document.querySelector(`input[name="request_type"][value="${value}"]`)?.closest('label')?.querySelector('small');if(small)small.textContent=text};
  set('rating',`Approx. 2 minutes · from ${money(c.custom_rating_cents)}`);
  set('personal_video',`3–5 minutes, including your name · usually ${money(c.custom_video_min_cents)}–${money(c.custom_video_max_cents)}`);
  set('story',`Written especially for you · from ${money(c.custom_story_cents)}`);
  set('story_narrated',`Your story, read in my voice · from ${money(c.custom_narrated_cents)}`);
  set('roleplay_kink',`More involved requests · from ${money(c.custom_kink_cents)}`);
}).catch(()=>{});
})();
