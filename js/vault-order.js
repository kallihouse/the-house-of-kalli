const panel = document.querySelector('#order-panel');
const token = new URLSearchParams(window.location.search).get('token') || '';

const money = (cents) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
}).format(Number(cents || 0) / 100);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);

const copyButton = (label, value) => `
  <button class="copy-value" type="button" data-copy="${escapeHtml(value)}">
    <span>${escapeHtml(label)}</span><span>COPY</span>
  </button>`;

const renderOrder = (order) => {
  if (order.status === 'paid') {
    const links = Array.isArray(order.access_links) ? order.access_links : [];
    const accessButtons = links.map((link, index) => {
      const label = link.name || `Private collection ${index + 1}`;
      return `<a class="vault-access-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
        <span>OPEN ${escapeHtml(label).toUpperCase()}</span><span>→</span>
      </a>`;
    }).join('');
    panel.innerHTML = `
      <p class="order-reference">${escapeHtml(order.reference)} · PAYMENT RECEIVED</p>
      <h2>Your access is ready.</h2>
      <p>${escapeHtml(order.product)}</p>
      ${accessButtons || '<p>Your collection link is being refreshed. Please check again shortly.</p>'}
      <small>Save your collection in Dropbox so you can return whenever you like.</small>`;
    return;
  }

  panel.innerHTML = `
    <p class="order-reference">ORDER ${escapeHtml(order.reference)}</p>
    <h2>Complete your payment.</h2>
    <div class="order-summary">
      <p><span>Collection</span><strong>${escapeHtml(order.product)}</strong></p>
      <p><span>Amount</span><strong>${money(order.amount)}</strong></p>
    </div>
    <div class="payid-instructions">
      <p>Pay from your banking app using the PayID below. Enter the order reference exactly so your payment can be matched.</p>
      ${copyButton('PAYID', order.payid)}
      ${copyButton('PAYID NAME', order.payid_name)}
      ${copyButton('AMOUNT', money(order.amount))}
      ${copyButton('PAYMENT REFERENCE', order.reference)}
    </div>
    <p class="payment-waiting">AWAITING PAYMENT CONFIRMATION</p>
    <button class="refresh-order" type="button">CHECK MY PAYMENT STATUS →</button>`;
};

const loadOrder = async () => {
  if (!token) {
    panel.innerHTML = '<p>This private order link is incomplete.</p>';
    return;
  }
  try {
    const response = await fetch(`/api/vault-orders/${encodeURIComponent(token)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Private order not found.');
    renderOrder(result);
  } catch (error) {
    panel.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
};

panel.addEventListener('click', async (event) => {
  const copy = event.target.closest('[data-copy]');
  if (copy) {
    await navigator.clipboard.writeText(copy.dataset.copy || '');
    const last = copy.querySelector('span:last-child');
    last.textContent = 'COPIED';
    window.setTimeout(() => { last.textContent = 'COPY'; }, 1400);
    return;
  }
  if (event.target.closest('.refresh-order')) loadOrder();
});

loadOrder();
