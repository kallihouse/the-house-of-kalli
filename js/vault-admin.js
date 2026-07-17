const login = document.querySelector('#admin-login');
const status = document.querySelector('#admin-status');
const ordersContainer = document.querySelector('#admin-orders');
let adminSecret = '';

const money = (cents) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
}).format(Number(cents || 0) / 100);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);

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
      railed: 'Railed', good_girl: 'Good Girl', mouthful: 'Mouthful',
      private_play: 'Private Play', full_sessions: 'Full Sessions',
    };
    let accessUrls = [];
    try {
      const parsed = JSON.parse(order.access_url || '[]');
      accessUrls = Array.isArray(parsed) ? parsed : [order.access_url];
    } catch {
      if (order.access_url) accessUrls = [order.access_url];
    }
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
        <label class="admin-access-url">
          <span>Private Dropbox link(s) · one per line</span>
          <textarea rows="${Math.max(2, accessUrls.length)}" placeholder="https://www.dropbox.com/…">${escapeHtml(accessUrls.join('\n'))}</textarea>
        </label>
        <div class="admin-actions">
          <button type="button" data-action="paid">MARK PAYMENT RECEIVED</button>
          ${sendLink ? `<a href="${escapeHtml(sendLink)}" target="_blank" rel="noopener noreferrer">SEND ACCESS →</a>` : ''}
          ${order.status === 'paid' && order.delivery_method === 'private' ? '<span>ACCESS IS NOW VISIBLE IN THEIR PRIVATE ORDER ROOM</span>' : ''}
        </div>
        <p class="admin-order-status" hidden></p>
      </article>`;
  }).join('');
};

const loadOrders = async () => {
  const response = await fetch('/api/vault-admin', {
    headers: { Authorization: `Bearer ${adminSecret}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Orders could not be opened.');
  renderOrders(result.orders || []);
};

login.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminSecret = String(new FormData(login).get('admin_password') || '');
  status.hidden = false;
  status.textContent = 'Opening orders…';
  try {
    await loadOrders();
    login.hidden = true;
    ordersContainer.hidden = false;
  } catch (error) {
    status.textContent = error.message;
  }
});

ordersContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="paid"]');
  if (!button) return;
  const card = button.closest('.admin-order');
  const message = card.querySelector('.admin-order-status');
  const accessUrls = card.querySelector('textarea').value.split('\n').map((value) => value.trim()).filter(Boolean);
  button.disabled = true;
  message.hidden = false;
  message.textContent = 'Saving…';
  try {
    const response = await fetch('/api/vault-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
      body: JSON.stringify({ id: Number(card.dataset.orderId), status: 'paid', access_urls: accessUrls }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Order could not be updated.');
    await loadOrders();
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
});
