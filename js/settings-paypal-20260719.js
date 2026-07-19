document.addEventListener('DOMContentLoaded',()=>{
  const find=selector=>document.querySelector(selector);
  const form=find('#settings-form');
  const message=find('#settings-message');
  const field=name=>form.elements.namedItem(name);
  const dollars=cents=>Number(cents||0)/100;
  const cents=value=>Math.round(Number(value||0)*100);
  const setMessage=(text,type='')=>{message.textContent=text;message.className=type};
  const syncMethods=()=>{
    find('[data-payid-fields]').classList.toggle('is-disabled',!field('payid_enabled').checked);
    find('[data-paypal-fields]').classList.toggle('is-disabled',!field('paypal_enabled').checked);
  };
  const fill=settings=>{
    for(const key of ['house_name','host_name','contact_email','payid_value','payid_name','paypal_url','default_payment_method']){
      if(field(key))field(key).value=settings[key]||'';
    }
    field('payid_enabled').checked=Boolean(settings.payid_enabled);
    field('paypal_enabled').checked=Boolean(settings.paypal_enabled);
    field('custom_rating').value=dollars(settings.custom_rating_cents);
    field('custom_video_min').value=dollars(settings.custom_video_min_cents);
    field('custom_video_max').value=dollars(settings.custom_video_max_cents);
    field('custom_story').value=dollars(settings.custom_story_cents);
    field('custom_narrated').value=dollars(settings.custom_narrated_cents);
    field('custom_kink').value=dollars(settings.custom_kink_cents);
    find('#password-status').textContent=settings.office_password_configured?'Protected':'Needs attention';
    find('#paypal-automatic-status').textContent=settings.paypal_automatic_configured?'Connected':'Needs connection';
    syncMethods();
  };
  const registration=async()=>{
    if(!('serviceWorker'in navigator))throw Error('Alerts are not available on this device.');
    await navigator.serviceWorker.register('/sw-20260718.js',{scope:'/'});
    return navigator.serviceWorker.ready;
  };
  const base64ToBytes=value=>{
    const padding='='.repeat((4-value.length%4)%4);
    const raw=atob((value+padding).replaceAll('-','+').replaceAll('_','/'));
    return Uint8Array.from(raw,character=>character.charCodeAt(0));
  };
  const loadAlertStatus=async()=>{
    const button=find('#alert-toggle'),title=find('#alert-status'),copy=find('#alert-copy');
    if(!('Notification'in window)||!('PushManager'in window)){
      button.disabled=true;button.textContent='NOT AVAILABLE';title.textContent='Not available on this device';return;
    }
    try{
      const worker=await registration(),subscription=await worker.pushManager.getSubscription();
      button.dataset.enabled=subscription?'1':'0';button.textContent=subscription?'DISABLE ON THIS DEVICE':'ENABLE ON THIS DEVICE';
      title.textContent=subscription?'House alerts are enabled':'House alerts are off';
      copy.textContent=subscription?'Orders, requests and private messages will appear discreetly.':'Enable alerts to hear when something arrives.';
    }catch(error){title.textContent='Alerts could not be checked';copy.textContent=error.message}
  };
  const load=async()=>{
    try{
      const response=await fetch('/api/office-settings',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Settings could not be opened.');
      fill(data.settings);
      find('#device-count').textContent=`${data.push_devices} alert device${data.push_devices===1?'':'s'} connected.`;
      find('#settings-loading').hidden=true;form.hidden=false;
      await loadAlertStatus();
    }catch(error){find('#settings-loading').textContent=error.message||'Settings could not be opened.'}
  };
  form.addEventListener('change',event=>{if(['payid_enabled','paypal_enabled'].includes(event.target.name))syncMethods()});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;setMessage('Saving…');
    const data=Object.fromEntries(new FormData(form));
    Object.assign(data,{payid_enabled:field('payid_enabled').checked,paypal_enabled:field('paypal_enabled').checked,
      custom_rating_cents:cents(field('custom_rating').value),custom_video_min_cents:cents(field('custom_video_min').value),
      custom_video_max_cents:cents(field('custom_video_max').value),custom_story_cents:cents(field('custom_story').value),
      custom_narrated_cents:cents(field('custom_narrated').value),custom_kink_cents:cents(field('custom_kink').value)});
    try{
      const response=await fetch('/api/office-settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Settings could not be saved.');
      fill(result.settings);setMessage('Settings saved.','success');
    }catch(error){setMessage(error.message||'Settings could not be saved.','error')}finally{button.disabled=false}
  });
  find('#alert-toggle').addEventListener('click',async()=>{
    const button=find('#alert-toggle'),title=find('#alert-status'),copy=find('#alert-copy');button.disabled=true;
    try{
      const worker=await registration(),existing=await worker.pushManager.getSubscription();
      if(existing){
        await fetch('/api/office-push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:existing.endpoint})});
        await existing.unsubscribe();
      }else{
        const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notifications were not allowed.');
        const keyResponse=await fetch('/api/office-push',{cache:'no-store'}),keyData=await keyResponse.json();if(!keyResponse.ok)throw Error(keyData.error);
        const created=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToBytes(keyData.publicKey)});
        const saved=await fetch('/api/office-push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:created.toJSON()})});
        if(!saved.ok){const result=await saved.json();throw Error(result.error)}
      }
      await loadAlertStatus();
    }catch(error){title.textContent='Alerts could not be changed';copy.textContent=error.message||'Please try again.'}finally{button.disabled=false}
  });
  find('#logout-button').addEventListener('click',async()=>{await fetch('/api/office-logout',{method:'POST'});location.href='/office'});
  find('[data-open-menu]')?.addEventListener('click',()=>document.body.classList.add('menu-open'));
  document.querySelectorAll('[data-close-menu]').forEach(button=>button.addEventListener('click',()=>document.body.classList.remove('menu-open')));
  load();
});
