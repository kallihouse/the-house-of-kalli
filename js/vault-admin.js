const login = document.querySelector('#admin-login');
const status = document.querySelector('#admin-status');
const ordersContainer = document.querySelector('#admin-orders');
const linkManager = document.querySelector('#vault-link-manager');
const linksForm = document.querySelector('#vault-links-form');
let adminSecret = '';

const money = (cents) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
}).format(Number(cents || 0) / 100);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);

const renderCollectionLinks = (links) => {
  linksForm.innerHTML = `
    <div class="vault-link-fields">
      ${links.map((link) => `
        <label>
          <span>${escapeHtml(link.collection_name)}</span>
          <input type="url" name="${escapeHtml(link.collection_code)}" value="${escapeHtml(link.access_url)}" placeholder="https://www.dropbox.com/…">
        </label>`).join('')}
    </div>
    <button type="submit">SAVE CURRENT LINKS →</button>
    <p class="form-status" id="vault-links-status" hidden></p>`;
};

const deliveryLink = (order) => {
  if (order.delivery_method === 'private') return '';
  const orderRoom = `${window.location.origin}/vault-order.html?token=${encodeURIComponent(order.public_token)}`;
  const message = `Your House of Kalli access is ready: ${orderRoom}`;
  if (order.delivery_method === 'email') {
    return `mailto:${encodeURIComponent(order.delivery_contact)}?subject=${encodeURIComponent('Your House of Kalli access')}&body=${encodeURIComponent(message)}`;
  }
  if (order.delivery_method === 'whatsapp') {
    const number = order.delivery_contact.replace(/\D/g, '').replace(/^0/, '61');
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
  return `sms:${order.delivery_contact.replace(/[^+\d]/g, '')}?&body=${encodeURIComponent(message)}`;
};

const renderOrders = (orders) => {
  if (!orders.length) {
    ordersContainer.innerHTML = '<p>No Vault orders yet.</p>';
    return;
  }
  ordersContainer.innerHTML = orders.map((order) => {
    const sendLink = order.status === 'paid' ? deliveryLink(order) : '';
    let selections = [];
    try { selections = JSON.parse(order.selected_collections || '[]'); } catch { selections = []; }
    const collectionNames = {
      taster: 'A Little Taste', railed: 'Railed', good_girl: 'Good Girl', mouthful: 'Mouthful',
      private_play: 'Private Play', full_sessions: 'Full Sessions',
    };
    return `
      <article class="admin-order" data-order-id="${order.id}">
        <div class="admin-order-head">
          <div><span>${escapeHtml(order.order_reference)}</span><h2>${escapeHtml(order.product_name)}</h2></div>
          <strong>${money(order.amount_cents)}</strong>
        </div>
        <dl>
          <div><dt>Status</dt><dd>${escapeHtml(order.status.replaceAll('_', ' '))}</dd></div>
          <div><dt>Delivery</dt><dd>${escapeHtml(order.delivery_method)}${order.delivery_contact ? ` · ${escapeHtml(order.delivery_contact)}` : ''}</dd></div>
          <div><dt>Ordered</dt><dd>${escapeHtml(order.created_at)}</dd></div>
        </dl>
        ${selections.length ? `<p class="admin-selections"><b>Collections:</b> ${selections.map((value) => escapeHtml(collectionNames[value] || value)).join(' · ')}</p>` : ''}
        <p class="admin-link-note">This order uses the current rotating link${selections.length > 1 || order.product_code === 'complete_vault' ? 's' : ''} saved above.</p>
        <div class="admin-actions">
          <button type="button" data-action="paid">MARK PAYMENT RECEIVED</button>
          ${sendLink ? `<a href="${escapeHtml(sendLink)}" target="_blank" rel="noopener noreferrer">SEND ACCESS →</a>` : ''}
          ${order.status === 'paid' && order.delivery_method === 'private' ? '<span>ACCESS IS NOW VISIBLE IN THEIR PRIVATE ORDER ROOM</span>' : ''}
        </div>
        <p class="admin-order-status" hidden></p>
      </article>`;
  }).join('');
};

const loadDashboard = async () => {
  const response = await fetch('/api/vault-admin', {
    headers: { Authorization: `Bearer ${adminSecret}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Orders could not be opened.');
  renderCollectionLinks(result.collection_links || []);
  renderOrders(result.orders || []);
};

login.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminSecret = String(new FormData(login).get('admin_password') || '');
  status.hidden = false;
  status.textContent = 'Opening orders…';
  try {
    await loadDashboard();
    login.hidden = true;
    linkManager.hidden = false;
    ordersContainer.hidden = false;
    status.hidden = true;
  } catch (error) {
    status.textContent = error.message;
  }
});

linksForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = linksForm.querySelector('#vault-links-status');
  const button = linksForm.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(linksForm).entries());
  button.disabled = true;
  message.hidden = false;
  message.textContent = 'Saving current links…';
  try {
    const response = await fetch('/api/vault-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
      body: JSON.stringify({ action: 'save_collection_links', collection_links: values }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The links could not be saved.');
    await loadDashboard();
    const savedMessage = linksForm.querySelector('#vault-links-status');
    savedMessage.hidden = false;
    savedMessage.textContent = 'Current customer links saved.';
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

ordersContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="paid"]');
  if (!button) return;
  const card = button.closest('.admin-order');
  const message = card.querySelector('.admin-order-status');
  button.disabled = true;
  message.hidden = false;
  message.textContent = 'Saving…';
  try {
    const response = await fetch('/api/vault-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
      body: JSON.stringify({ id: Number(card.dataset.orderId), status: 'paid' }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Order could not be updated.');
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
});
