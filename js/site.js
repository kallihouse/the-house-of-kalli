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

const vaultForm = document.querySelector('#vault-order-form');
const vaultCheckout = document.querySelector('#vault-checkout');

if (vaultForm && vaultCheckout) {
  const products = {
    taster: { name: 'A Little Taste', price: '$150', selections: 0 },
    railed: { name: 'Railed', price: '$249', selections: 0 },
    good_girl: { name: 'Good Girl', price: '$299', selections: 0 },
    mouthful: { name: 'Mouthful', price: '$249', selections: 0 },
    private_play: { name: 'Private Play', price: '$299', selections: 0 },
    full_sessions: { name: 'Full Sessions', price: '$349', selections: 0 },
    bundle_two: { name: 'Two Rooms', price: '$449', selections: 2 },
    bundle_three: { name: 'Three Rooms', price: '$599', selections: 3 },
    complete_vault: { name: 'Every Room', price: '$699', selections: 0 },
  };
  const productInput = vaultForm.querySelector('[name="product_code"]');
  const selectedProduct = document.querySelector('#vault-selected-product');
  const selectedPrice = document.querySelector('#vault-selected-price');
  const bundleOptions = document.querySelector('#vault-bundle-options');
  const bundleInstruction = document.querySelector('#vault-bundle-instruction');
  const collectionInputs = [...vaultForm.querySelectorAll('[name="selected_collections"]')];
  const contactField = document.querySelector('#vault-contact-field');
  const contactLabel = document.querySelector('#vault-contact-label');
  const contactInput = contactField?.querySelector('input');
  const privateFields = document.querySelector('#vault-private-fields');
  const privateInputs = [...(privateFields?.querySelectorAll('input[type="password"]') || [])];
  const formStatus = document.querySelector('#vault-form-status');

  const updateDeliveryFields = () => {
    const method = vaultForm.querySelector('[name="delivery_method"]:checked')?.value || '';
    const isPrivate = method === 'private';
    privateFields.hidden = !isPrivate;
    privateInputs.forEach((input) => { input.required = isPrivate; });

    const needsContact = ['email', 'text', 'whatsapp'].includes(method);
    contactField.hidden = !needsContact;
    contactInput.required = needsContact;
    if (!needsContact) return;

    if (method === 'email') {
      contactLabel.textContent = 'Email address';
      contactInput.type = 'email';
      contactInput.autocomplete = 'email';
      contactInput.placeholder = 'you@example.com';
    } else {
      contactLabel.textContent = method === 'whatsapp' ? 'WhatsApp number' : 'Mobile number';
      contactInput.type = 'tel';
      contactInput.autocomplete = 'tel';
      contactInput.placeholder = '04…';
    }
  };

  document.querySelectorAll('[data-vault-product]').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.dataset.vaultProduct;
      const product = products[code];
      if (!product) return;

      productInput.value = code;
      selectedProduct.textContent = product.name;
      selectedPrice.textContent = product.price;
      collectionInputs.forEach((input) => { input.checked = false; });
      bundleOptions.hidden = product.selections === 0;
      bundleInstruction.textContent = product.selections
        ? `Choose exactly ${product.selections} collections.`
        : '';
      vaultCheckout.hidden = false;
      vaultCheckout.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  vaultForm.querySelectorAll('[name="delivery_method"]').forEach((option) => {
    option.addEventListener('change', updateDeliveryFields);
  });
  updateDeliveryFields();

  vaultForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const product = products[productInput.value];
    const selectedCollections = collectionInputs.filter((input) => input.checked).map((input) => input.value);
    const deliveryMethod = vaultForm.querySelector('[name="delivery_method"]:checked')?.value || '';
    const password = privateInputs[0]?.value || '';
    const passwordConfirm = privateInputs[1]?.value || '';
    const submitButton = vaultForm.querySelector('button[type="submit"]');

    formStatus.hidden = false;
    if (!product) {
      formStatus.textContent = 'Choose a collection first.';
      return;
    }
    if (product.selections && selectedCollections.length !== product.selections) {
      formStatus.textContent = `Choose exactly ${product.selections} collections.`;
      return;
    }
    if (!deliveryMethod) {
      formStatus.textContent = 'Choose how you would like to receive your access.';
      return;
    }
    if (deliveryMethod === 'private' && password !== passwordConfirm) {
      formStatus.textContent = 'Your private passwords do not match.';
      return;
    }

    submitButton.disabled = true;
    formStatus.textContent = 'Creating your private order…';
    try {
      const response = await fetch('/api/vault-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_code: productInput.value,
          selected_collections: selectedCollections,
          delivery_method: deliveryMethod,
          delivery_contact: contactInput?.value.trim() || '',
          private_password: deliveryMethod === 'private' ? password : '',
          private_password_confirm: deliveryMethod === 'private' ? passwordConfirm : '',
          age_confirmed: vaultForm.querySelector('[name="age_confirmed"]')?.checked || false,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your order could not be created.');
      window.location.assign(`/vault-order.html?token=${encodeURIComponent(result.token)}`);
    } catch (error) {
      formStatus.textContent = error.message;
      submitButton.disabled = false;
    }
  });
}
