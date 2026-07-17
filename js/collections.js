(() => {
  const grid = document.querySelector('#collection-grid');
  const status = document.querySelector('#collection-status');
  const modal = document.querySelector('#collection-modal');
  const form = document.querySelector('#collection-form');
  const message = document.querySelector('#form-message');
  const toast = document.querySelector('#toast');
  let collections = [];
  let toastTimer;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char]);
  const shortUrl = (value) => { try { const url = new URL(value); return `${url.hostname}${url.pathname}`; } catch { return 'No private link saved'; } };
  const date = (value) => value ? new Intl.DateTimeFormat('en-AU', { day:'numeric', month:'short', year:'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`)) : 'Not updated yet';

  function notify(text) {
    clearTimeout(toastTimer); toast.textContent = text; toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function render() {
    const ready = collections.filter((item) => item.access_url).length;
    document.querySelector('#collection-total').textContent = collections.length;
    document.querySelector('#collection-ready').textContent = ready;
    document.querySelector('#collection-missing').textContent = collections.length - ready;
    status.hidden = true; grid.hidden = false;
    grid.innerHTML = collections.map((collection, index) => `
      <article class="collection-card">
        <div class="collection-visual"><span class="collection-number">0${index + 1}</span><span class="link-state ${collection.access_url ? '' : 'missing'}">${collection.access_url ? 'READY' : 'NEEDS LINK'}</span></div>
        <div class="collection-body"><span class="collection-type">${escapeHtml(collection.type)}</span><h2>${escapeHtml(collection.name)}</h2>
          <div class="link-details"><span>${escapeHtml(shortUrl(collection.access_url))}</span><small>${collection.access_url ? `Updated ${escapeHtml(date(collection.updated_at))}` : 'Delivery is currently paused'}</small></div>
          <div class="card-actions"><button data-edit="${escapeHtml(collection.code)}">${collection.access_url ? 'UPDATE LINK' : 'ADD LINK'}</button>${collection.access_url ? `<a href="${escapeHtml(collection.access_url)}" target="_blank" rel="noopener noreferrer">TEST LINK</a>` : ''}</div>
        </div>
      </article>`).join('');
  }

  async function load() {
    status.hidden = false; status.textContent = 'Opening the collection cabinet…'; grid.hidden = true;
    try {
      const response = await fetch('/api/office-collections');
      if (response.status === 401) { window.location.href = '/collections'; return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Collections could not be opened.');
      collections = result.collections || []; render();
    } catch (error) { status.textContent = error.message; }
  }

  function openEditor(code) {
    const collection = collections.find((item) => item.code === code); if (!collection) return;
    document.querySelector('#link-title').textContent = collection.name;
    form.elements.code.value = collection.code; form.elements.access_url.value = collection.access_url;
    message.hidden = true; modal.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => form.elements.access_url.focus(), 50);
  }
  function closeEditor() { modal.hidden = true; document.body.style.overflow = ''; }

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const submit = form.querySelector('[type=submit]'); submit.disabled = true;
    message.hidden = false; message.className = 'form-message'; message.textContent = 'Saving current link…';
    try {
      const response = await fetch('/api/office-collections', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code:form.elements.code.value, access_url:form.elements.access_url.value }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The link could not be saved.');
      message.classList.add('success'); message.textContent = 'Current link saved.'; await load(); notify('Collection link updated.'); setTimeout(closeEditor, 350);
    } catch (error) { message.textContent = error.message; } finally { submit.disabled = false; }
  });

  grid.addEventListener('click', (event) => { const button = event.target.closest('[data-edit]'); if (button) openEditor(button.dataset.edit); });
  document.querySelector('[data-test-link]').addEventListener('click', () => { const url = form.elements.access_url.value.trim(); if (url) window.open(url, '_blank', 'noopener'); else { message.hidden = false; message.textContent = 'Add a link before testing it.'; } });
  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeEditor));
  document.querySelector('#refresh-collections').addEventListener('click', () => { load(); notify('Collection links refreshed.'); });
  document.querySelector('[data-open-menu]').addEventListener('click', () => document.body.classList.add('menu-open'));
  document.querySelectorAll('[data-close-menu]').forEach((button) => button.addEventListener('click', () => document.body.classList.remove('menu-open')));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeEditor(); });
  load();
})();
