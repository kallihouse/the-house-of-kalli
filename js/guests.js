(() => {
  const list = document.querySelector('#guest-list');
  const status = document.querySelector('#directory-status');
  const empty = document.querySelector('#empty-state');
  const search = document.querySelector('#guest-search');
  const filter = document.querySelector('#guest-filter');
  const modal = document.querySelector('#guest-modal');
  const form = document.querySelector('#guest-form');
  const formMessage = document.querySelector('#form-message');
  let guests = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char]);
  const tags = (guest) => { try { return JSON.parse(guest.tags || '[]'); } catch { return []; } };
  const money = (cents) => new Intl.NumberFormat('en-AU', { style:'currency', currency:'AUD', maximumFractionDigits:0 }).format(Number(cents || 0) / 100);
  const initials = (name) => String(name).split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase();

  function updateSummary() {
    const thisMonth = new Date().toISOString().slice(0, 7);
    document.querySelector('#total-guests').textContent = guests.length;
    document.querySelector('#total-collectors').textContent = guests.filter((g) => g.private_collection).length;
    document.querySelector('#total-returning').textContent = guests.filter((g) => g.visit_count > 1 || g.collection_count > 1).length;
    document.querySelector('#total-new').textContent = guests.filter((g) => String(g.created_at).slice(0, 7) === thisMonth).length;
  }

  function render() {
    const term = search.value.trim().toLowerCase();
    const mode = filter.value;
    const shown = guests.filter((guest) => {
      const haystack = [guest.display_name, guest.contact_value, guest.notes, ...tags(guest)].join(' ').toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (mode === 'collectors' && !guest.private_collection) return false;
      if (mode === 'returning' && !(guest.visit_count > 1 || guest.collection_count > 1)) return false;
      return true;
    });
    status.hidden = true;
    empty.hidden = guests.length > 0;
    list.hidden = guests.length === 0;
    if (!guests.length) return;
    list.innerHTML = shown.length ? shown.map((guest) => `
      <article class="guest-row" data-id="${guest.id}" tabindex="0">
        <div class="guest-identity"><span class="guest-initials">${escapeHtml(initials(guest.display_name))}</span><span><strong>${escapeHtml(guest.display_name)}</strong><small>${escapeHtml(guest.contact_method === 'none' ? 'No contact saved' : guest.contact_value || guest.contact_method)}</small></span></div>
        <div class="guest-tags">${tags(guest).slice(0,3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}${guest.private_collection ? '<span>Collector</span>' : ''}</div>
        <div class="guest-metric spend"><span>LIFETIME</span><strong>${money(guest.lifetime_spend_cents)}</strong></div>
        <div class="guest-metric"><span>VISITS</span><strong>${guest.visit_count || 0}</strong></div>
        <span class="guest-arrow">›</span>
      </article>`).join('') : '<div class="directory-status">No guests match that search.</div>';
  }

  function openForm(guest = null) {
    form.reset();
    formMessage.hidden = true;
    document.querySelector('#guest-form-title').textContent = guest ? 'Guest details' : 'Add a guest';
    if (guest) {
      form.elements.id.value = guest.id;
      form.elements.display_name.value = guest.display_name;
      form.elements.contact_method.value = guest.contact_method;
      form.elements.contact_value.value = guest.contact_value;
      form.elements.birthday.value = guest.birthday;
      form.elements.tags.value = tags(guest).join(', ');
      form.elements.private_collection.checked = Boolean(guest.private_collection);
      form.elements.notes.value = guest.notes;
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => form.elements.display_name.focus(), 50);
  }

  function closeForm() { modal.hidden = true; document.body.style.overflow = ''; }

  async function loadGuests() {
    try {
      const response = await fetch('/api/office-guests');
      if (response.status === 401) { window.location.href = '/guests'; return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The guest book could not be opened.');
      guests = result.guests || [];
      updateSummary(); render();
    } catch (error) { status.textContent = error.message; }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.private_collection = form.elements.private_collection.checked;
    data.tags = data.tags.split(',');
    const editing = Boolean(data.id);
    formMessage.hidden = false; formMessage.className = 'form-message'; formMessage.textContent = 'Saving guest…';
    const submit = form.querySelector('[type=submit]'); submit.disabled = true;
    try {
      const response = await fetch('/api/office-guests', { method: editing ? 'PATCH' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The guest could not be saved.');
      formMessage.classList.add('success'); formMessage.textContent = 'Guest saved.';
      await loadGuests(); setTimeout(closeForm, 350);
    } catch (error) { formMessage.textContent = error.message; }
    finally { submit.disabled = false; }
  });

  document.querySelector('#add-guest').addEventListener('click', () => openForm());
  document.querySelector('[data-empty-add]').addEventListener('click', () => openForm());
  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeForm));
  document.querySelector('[data-open-menu]').addEventListener('click', () => document.body.classList.add('menu-open'));
  document.querySelectorAll('[data-close-menu]').forEach((button) => button.addEventListener('click', () => document.body.classList.remove('menu-open')));
  list.addEventListener('click', (event) => { const row = event.target.closest('.guest-row'); if (row) openForm(guests.find((guest) => guest.id === Number(row.dataset.id))); });
  list.addEventListener('keydown', (event) => { if (event.key === 'Enter') { const row = event.target.closest('.guest-row'); if (row) openForm(guests.find((guest) => guest.id === Number(row.dataset.id))); } });
  search.addEventListener('input', render); filter.addEventListener('change', render);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeForm(); });
  loadGuests();
})();
