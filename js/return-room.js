const form = document.querySelector('#return-form');
const password = form?.querySelector('input[name="private_password"]');
const showPassword = document.querySelector('#show-return-password');
const statusMessage = document.querySelector('#return-status');

showPassword?.addEventListener('change', () => {
  password.type = showPassword.checked ? 'text' : 'password';
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  statusMessage.hidden = false;
  statusMessage.textContent = 'Opening your private room…';

  try {
    const response = await fetch('/api/return-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ private_password: password.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'That waiting room could not be opened.');
    window.location.assign(`/waiting.html?token=${encodeURIComponent(result.token)}`);
  } catch (error) {
    statusMessage.textContent = error.message;
    button.disabled = false;
  }
});
