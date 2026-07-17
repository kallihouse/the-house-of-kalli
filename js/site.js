const form = document.querySelector('#booking-form');
const statusMessage = document.querySelector('#form-status');
const passwordFields = document.querySelector('#password-fields');
const passwordInputs = passwordFields?.querySelectorAll('input[type="password"]') || [];
const showPassword = document.querySelector('#show-private-password');
const locationSelect = form?.querySelector('select[name="location"]');
const destinationField = document.querySelector('#destination-field');
const destinationInput = destinationField?.querySelector('input');

document.querySelectorAll('.rooms .room[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    history.pushState(null, '', link.getAttribute('href'));
  });
});

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

const digitalForm = document.querySelector('#digital-form');
const digitalStatus = document.querySelector('#digital-form-status');
const digitalPasswordFields = document.querySelector('#digital-password-fields');
const digitalPasswordInputs = digitalPasswordFields?.querySelectorAll('input[type="password"]') || [];
const showDigitalPassword = document.querySelector('#show-digital-password');

if (digitalForm) {
  const updateDigitalPasswordFields = () => {
    const selected = digitalForm.querySelector('input[name="contact_preference"]:checked');
    const isPrivate = selected?.value === 'private_house_reply';
    digitalPasswordFields.hidden = !isPrivate;
    digitalPasswordInputs.forEach((input) => { input.required = isPrivate; });
  };

  digitalForm.querySelectorAll('input[name="contact_preference"]').forEach((option) => {
    option.addEventListener('change', updateDigitalPasswordFields);
  });

  updateDigitalPasswordFields();
  window.addEventListener('pageshow', updateDigitalPasswordFields);

  showDigitalPassword?.addEventListener('change', () => {
    digitalPasswordInputs.forEach((input) => {
      input.type = showDigitalPassword.checked ? 'text' : 'password';
    });
  });

  digitalForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = digitalForm.querySelector('button[type="submit"]');
    const formData = new FormData(digitalForm);
    const selectedExperience = String(formData.get('digital_experience') || '');
    const digitalNotes = String(formData.get('digital_notes') || '').trim();
    const payload = Object.fromEntries(formData.entries());

    payload.request_type = 'digital';
    payload.experience = selectedExperience;
    payload.connection = digitalNotes || 'Digital experience request';
    payload.duration = selectedExperience;
    payload.location = 'Digital';
    payload.notes = digitalNotes;
    payload.rates_read = true;
    payload.deposit_agreed = formData.has('payment_agreed');
    delete payload.digital_experience;
    delete payload.digital_notes;
    delete payload.payment_agreed;

    if (payload.contact_preference === 'private_house_reply' &&
        payload.private_password !== payload.private_password_confirm) {
      digitalStatus.hidden = false;
      digitalStatus.textContent = 'Your private passwords do not match.';
      return;
    }

    submitButton.disabled = true;
    digitalStatus.hidden = false;
    digitalStatus.textContent = 'Sending your request…';

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
      digitalStatus.textContent = error.message;
      submitButton.disabled = false;
    }
  });
}
