const form = document.querySelector('#booking-form');
const statusMessage = document.querySelector('#form-status');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.rates_read = formData.has('rates_read');
    payload.deposit_agreed = formData.has('deposit_agreed');

    submitButton.disabled = true;
    statusMessage.hidden = false;
    statusMessage.textContent = 'Sending your request…';

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your request could not be sent.');

      window.location.assign(`/waiting.html?token=${encodeURIComponent(result.token)}`);
    } catch (error) {
      statusMessage.textContent = error.message;
      submitButton.disabled = false;
    }
  });
}
