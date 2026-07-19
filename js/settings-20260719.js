(()=>{
const $=s=>document.querySelector(s),form=$('#settings-form'),message=$('#settings-message');
const dollars=cents=>Number(cents||0)/100;
const cents=value=>Math.round(Number(value||0)*100);
const setMessage=(text,type='')=>{message.textContent=text;message.className=type};
const syncMethods=()=>{
  $('[data-payid-fields]').classList.toggle('is-disabled',!form.payid_enabled.checked);
  $('[data-paypal-fields]').classList.toggle('is-disabled',!form.paypal_enabled.checked);
};
const fill=s=>{
  for(const key of ['house_name','host_name','contact_email','payid_value','payid_name','paypal_url','default_payment_method'])if(form.elements[key])form.elements[key].value=s[key]||'';
  form.payid_enabled.checked=Boolean(s.payid_enabled);form.paypal_enabled.checked=Boolean(s.paypal_enabled);
  form.custom_rating.value=dollars(s.custom_rating_cents);form.custom_video_min.value=dollars(s.custom_video_min_cents);
  form.custom_video_max.value=dollars(s.custom_video_max_cents);form.custom_story.value=dollars(s.custom_story_cents);
  form.custom_narrated.value=dollars(s.custom_narrated_cents);form.custom_kink.value=dollars(s.custom_kink_cents);
  $('#password-status').textContent=s.office_password_configured?'Protected':'Needs attention';syncMethods();
};
async function load(){
  try{const r=await fetch('/api/office-settings',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);fill(d.settings);$('#device-count').textContent=`${d.push_devices} alert device${d.push_devices===1?'':'s'} connected.`;$('#settings-loading').hidden=true;form.hidden=false;await loadAlertStatus();}
  catch(error){$('#settings-loading').textContent=error.message||'Settings could not be opened.'}
}
form.addEventListener('change',e=>{if(['payid_enabled','paypal_enabled'].includes(e.target.name))syncMethods()});
form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;setMessage('Saving…');
  const data=Object.fromEntries(new FormData(form));
  Object.assign(data,{payid_enabled:form.payid_enabled.checked,paypal_enabled:form.paypal_enabled.checked,
    custom_rating_cents:cents(form.custom_rating.value),custom_video_min_cents:cents(form.custom_video_min.value),
    custom_video_max_cents:cents(form.custom_video_max.value),custom_story_cents:cents(form.custom_story.value),
    custom_narrated_cents:cents(form.custom_narrated.value),custom_kink_cents:cents(form.custom_kink.value)});
  try{const r=await fetch('/api/office-settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),d=await r.json();if(!r.ok)throw Error(d.error);fill(d.settings);setMessage('Settings saved.','success')}
  catch(error){setMessage(error.message||'Settings could not be saved.','error')}finally{button.disabled=false}
});

const base64ToBytes=value=>{const padding='='.repeat((4-value.length%4)%4),raw=atob((value+padding).replaceAll('-','+').replaceAll('_','/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
async function registration(){if(!('serviceWorker'in navigator))throw Error('Alerts are not available on this device.');return navigator.serviceWorker.register('/sw-20260718.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready)}
async function loadAlertStatus(){
  const button=$('#alert-toggle'),title=$('#alert-status'),copy=$('#alert-copy');
  if(!('Notification'in window)||!('PushManager'in window)){button.disabled=true;button.textContent='NOT AVAILABLE';title.textContent='Not available on this device';return}
  try{const reg=await registration(),sub=await reg.pushManager.getSubscription();button.dataset.enabled=sub?'1':'0';button.textContent=sub?'DISABLE ON THIS DEVICE':'ENABLE ON THIS DEVICE';title.textContent=sub?'House alerts are enabled':'House alerts are off';copy.textContent=sub?'Orders, requests and private messages will appear discreetly.':'Enable alerts to hear when something arrives.'}
  catch(error){title.textContent='Alerts could not be checked';copy.textContent=error.message}
}
$('#alert-toggle').addEventListener('click',async()=>{
  const button=$('#alert-toggle'),title=$('#alert-status'),copy=$('#alert-copy');button.disabled=true;
  try{const reg=await registration(),existing=await reg.pushManager.getSubscription();if(existing){await fetch('/api/office-push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:existing.endpoint})});await existing.unsubscribe();}
    else{const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notifications were not allowed.');const r=await fetch('/api/office-push',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);const created=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToBytes(d.publicKey)});const saved=await fetch('/api/office-push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:created.toJSON()})});if(!saved.ok){const x=await saved.json();throw Error(x.error)}}await loadAlertStatus();}
  catch(error){title.textContent='Alerts could not be changed';copy.textContent=error.message||'Please try again.'}finally{button.disabled=false}
});
$('#logout-button').addEventListener('click',async()=>{await fetch('/api/office-logout',{method:'POST'});location.href='/office'});
$('[data-open-menu]')?.addEventListener('click',()=>document.body.classList.add('menu-open'));document.querySelectorAll('[data-close-menu]').forEach(b=>b.addEventListener('click',()=>document.body.classList.remove('menu-open')));
load();
})();
