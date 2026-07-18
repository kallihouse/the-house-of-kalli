(()=>{
  const PUBLIC_KEY='BFU8uZBTRC7SyjQHeSMTwfF82XzYDVqZMdRvsyvAXBMP38iSsijhTADETsmv8qEbzr_hW2Ki9qCvluOm3KcKClE';
  const decode=value=>{const padding='='.repeat((4-value.length%4)%4),raw=atob((value+padding).replaceAll('-','+').replaceAll('_','/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isiPhone=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);

  const panel=document.createElement('section');
  panel.className='house-alerts-panel';
  panel.innerHTML=`<div><p class="eyebrow">ON YOUR IPHONE</p><h2>House alerts</h2><p id="push-copy">Receive discreet notifications for orders, requests and private messages.</p></div><button id="push-toggle" type="button">CHECKING…</button>`;
  const quick=document.querySelector('.quick-section');
  if(quick)quick.before(panel);else document.querySelector('.page-wrap')?.append(panel);
  const button=panel.querySelector('#push-toggle'),copy=panel.querySelector('#push-copy');

  const style=document.createElement('style');
  style.textContent=`.house-alerts-panel{margin:28px 0;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:25px 28px;border-radius:14px;background:#2a2521;color:#fffaf4}.house-alerts-panel h2{margin:2px 0 6px;font:28px/1.1 Georgia,serif}.house-alerts-panel p:not(.eyebrow){margin:0;color:#cfc5bb;font-size:12px}.house-alerts-panel button{border:1px solid #8e7764;border-radius:7px;background:#fffaf4;color:#2a2521;padding:13px 17px;font-size:10px;font-weight:700;letter-spacing:.1em;white-space:nowrap;cursor:pointer}.house-alerts-panel button:disabled{opacity:.55;cursor:default}@media(max-width:640px){.house-alerts-panel{align-items:flex-start;flex-direction:column}.house-alerts-panel button{width:100%}}`;
  document.head.append(style);

  async function registration(){
    if(!('serviceWorker'in navigator))throw Error('This device does not support House alerts.');
    return navigator.serviceWorker.register('/sw-20260718.js',{scope:'/'});
  }
  async function current(){const reg=await registration();return {reg,subscription:await reg.pushManager.getSubscription()}}
  async function refresh(){
    if(!('Notification'in window)||!('PushManager'in window)){button.disabled=true;button.textContent='NOT AVAILABLE';return}
    if(isiPhone()&&!standalone()){
      button.disabled=true;button.textContent='ADD TO HOME SCREEN FIRST';
      copy.textContent='In Safari, tap Share, then Add to Home Screen. Open that icon to enable alerts.';
      return;
    }
    try{const {subscription}=await current();button.disabled=false;button.textContent=subscription?'DISABLE ALERTS':'ENABLE ALERTS';button.dataset.enabled=subscription?'yes':'no'}catch{button.disabled=true;button.textContent='NOT AVAILABLE'}
  }
  button.addEventListener('click',async()=>{
    button.disabled=true;copy.textContent='Connecting your private alerts…';
    try{
      const {reg,subscription}=await current();
      if(subscription){
        await fetch('/api/office-push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});
        await subscription.unsubscribe();
        copy.textContent='House alerts are switched off on this device.';
      }else{
        const permission=await Notification.requestPermission();
        if(permission!=='granted')throw Error('Notifications were not allowed. You can enable them later in iPhone Settings.');
        const created=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(PUBLIC_KEY)});
        const response=await fetch('/api/office-push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:created.toJSON()})});
        const data=await response.json();if(!response.ok)throw Error(data.error||'Alerts could not be enabled.');
        copy.textContent='Discreet House alerts are now enabled on this device.';
      }
    }catch(error){copy.textContent=error.message||'House alerts could not be changed.'}
    await refresh();
  });
  refresh();
})();
