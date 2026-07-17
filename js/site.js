const form = document.querySelector('#booking-form');
const statusMessage = document.querySelector('#form-status');
const passwordFields = document.querySelector('#password-fields');
const passwordInputs = passwordFields?.querySelectorAll('input[type="password"]') || [];
const showPassword = document.querySelector('#show-private-password');
const locationSelect = form?.querySelector('select[name="location"]');
const destinationField = document.querySelector('#destination-field');
const destinationInput = destinationField?.querySelector('input');

if (form) {
  const updatePasswordFields = () => {
    const selected = form.querySelector('input[name="contact_preference"]:checked');
    const isPrivate = selected?.value === 'private_house_reply';
    passwordFields.hidden = !isPrivate;
    passwordInputs.forEach((input) => { input.required = isPrivate; });
  };

  form.querySelectorAll('input[name="contact_preference"]').forEach((option) => {
    option.addEventListener('change', updatePasswordFields);
  });

  updatePasswordFields();
  window.addEventListener('pageshow', updatePasswordFields);

  const updateDestinationField = () => {
    const needsDestination = ['Outcall', 'Fly me to you'].includes(locationSelect?.value);
    destinationField.hidden = !needsDestination;
    destinationInput.required = needsDestination;
  };

  locationSelect?.addEventListener('change', updateDestinationField);
  updateDestinationField();
  window.addEventListener('pageshow', updateDestinationField);

  showPassword?.addEventListener('change', () => {
    passwordInputs.forEach((input) => {
      input.type = showPassword.checked ? 'text' : 'password';
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.rates_read = formData.has('rates_read');
    payload.deposit_agreed = formData.has('deposit_agreed');
    if (payload.destination) payload.location = `${payload.location} — ${payload.destination}`;
    delete payload.destination;

    if (payload.contact_preference === 'private_house_reply' &&
        payload.private_password !== payload.private_password_confirm) {
      statusMessage.hidden = false;
      statusMessage.textContent = 'Your private passwords do not match.';
      return;
    }

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
