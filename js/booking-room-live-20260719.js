(()=>{
  const token=new URLSearchParams(location.search).get('token')||'';
  const room=document.querySelector('#room'),opening=document.querySelector('#room-status'),messages=document.querySelector('#messages');
  const form=document.querySelector('#message-form'),messageStatus=document.querySelector('#message-status');
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let lastMessages='',loading=false;
  async function load(silent=false){
    if(loading||!token)return;
    loading=true;
    try{
      const r=await fetch(`/api/booking-room/${encodeURIComponent(token)}`,{cache:'no-store'}),x=await r.json();
      if(!r.ok)throw Error(x.error||'Your waiting room could not be opened.');
      opening.hidden=true;room.hidden=false;
      document.querySelector('#reference').textContent=x.reference;
      document.querySelector('#date').textContent=`${x.preferred_date} at ${x.preferred_time}`;
      document.querySelector('#status').textContent=x.status;
      const q=document.querySelector('#quote');
      if(x.quote_cents){q.hidden=false;q.innerHTML=`<strong>Kalli’s quote: ${new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(x.quote_cents/100)}</strong>${x.deposit_cents?`<p>Deposit required: ${new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(x.deposit_cents/100)}</p>`:''}`}
      const signature=JSON.stringify(x.messages||[]);
      if(signature!==lastMessages){
        const hadMessages=Boolean(lastMessages);
        lastMessages=signature;
        messages.innerHTML=(x.messages||[]).length?x.messages.map(m=>`<article class="message ${m.sender==='kalli'?'kalli':''}"><b>${m.sender==='kalli'?'KALLI':'YOU'}</b>${esc(m.body)}</article>`).join(''):'<div class="notice">No messages yet. Kalli will reply here if she wishes to proceed.</div>';
        if(silent&&hadMessages)messages.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    }catch(e){if(!silent)opening.textContent=e.message}
    finally{loading=false}
  }
  form.addEventListener('submit',async e=>{e.preventDefault();messageStatus.hidden=true;try{const r=await fetch(`/api/booking-room/${encodeURIComponent(token)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:form.elements.body.value})}),x=await r.json();if(!r.ok)throw Error(x.error||'Your message could not be sent.');form.reset();await load()}catch(err){messageStatus.textContent=err.message;messageStatus.hidden=false}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true)});
  window.addEventListener('focus',()=>load(true));
  load();
  setInterval(()=>{if(!document.hidden)load(true)},6000);
})();
