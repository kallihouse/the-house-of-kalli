const form = document.querySelector('#vault-return-form');
const status = document.querySelector('#vault-return-status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.hidden = false;
  status.textContent = 'Opening your private order…';
  try {
    const response = await fetch('/api/vault-return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your order could not be opened.');
    window.location.assign(`/vault-order.html?token=${encodeURIComponent(result.token)}`);
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});
