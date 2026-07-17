const content = document.querySelector('#waiting-content');
const token = new URLSearchParams(window.location.search).get('token');

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);

const renderPending = (data) => {
  content.innerHTML = `
    <p class="waiting-name">Request received for ${escapeHtml(data.name)}.</p>
    <h2>You're in the waiting room.</h2>
    <p>I haven't opened this conversation yet. You can return using this private link to check its status.</p>
    <div class="locked-room"><span>Conversation locked</span><span aria-hidden="true">○</span></div>
  `;
};

const renderDeclined = () => {
  content.innerHTML = `
    <h2>This request is now closed.</h2>
    <p>Thank you for taking the time to get in touch.</p>
  `;
};

const renderApproved = (data) => {
  const messages = data.messages.map((message) => `
    <article class="message ${message.sender === 'kalli' ? 'from-kalli' : 'from-client'}">
      <small>${message.sender === 'kalli' ? 'KALLI' : 'YOU'}</small>
      <p>${escapeHtml(message.body)}</p>
    </article>
  `).join('');

  content.innerHTML = `
    <h2>The conversation is open.</h2>
    <div class="message-list">${messages}</div>
    ${data.can_reply ? '<p class="waiting-note">Replying will be connected in the next build.</p>' : '<div class="locked-room"><span>Waiting for Kalli’s first message</span><span aria-hidden="true">○</span></div>'}
  `;
};

const loadRoom = async () => {
  if (!token) {
    content.innerHTML = '<h2>This private link is incomplete.</h2>';
    return;
  }

  try {
    const response = await fetch(`/api/waiting/${encodeURIComponent(token)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'This waiting room could not be opened.');

    if (data.status === 'pending') renderPending(data);
    else if (data.status === 'declined') renderDeclined();
    else renderApproved(data);
  } catch (error) {
    content.innerHTML = `<h2>${escapeHtml(error.message)}</h2>`;
  }
};

loadRoom();
