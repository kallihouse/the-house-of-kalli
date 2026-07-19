import { sendHousePush } from './lib/push.js';

const OFFICE_PATHS = new Set([
  '/office', '/office.html',
  '/guests', '/guests.html',
  '/collections', '/collections.html',
  '/orders', '/orders.html',
  '/visits', '/visits.html',
  '/correspondence', '/correspondence.html',
  '/journal', '/journal.html',
  '/finances', '/finances.html',
  '/customs', '/customs.html',
  '/settings', '/settings.html',
]);
const COOKIE_NAME = 'kalli_office_session';
const SESSION_SECONDS = 60 * 60 * 12;

const notificationFor = (pathname, method) => {
  if (method !== 'POST') return null;
  if (pathname === '/api/custom-requests') return { title: 'The House Office', body: 'A new custom request has arrived.', url: '/customs', tag: 'custom-request' };
  if (pathname.startsWith('/api/custom-room/')) return { title: 'The House Office', body: 'You have a new private message.', url: '/customs', tag: 'private-message' };
  if (pathname === '/api/vault-orders' || pathname === '/api/vault-orders/' || pathname === '/api/orders') return { title: 'The House Office', body: 'A new order has arrived.', url: '/orders', tag: 'new-order' };
  if (pathname === '/api/requests' || pathname.startsWith('/api/waiting/')) return { title: 'The House Office', body: 'A new private request has arrived.', url: '/correspondence', tag: 'new-request' };
  if (pathname === '/api/visit-request' || pathname === '/api/visits/request') return { title: 'The House Office', body: 'A new visit request has arrived.', url: '/visits', tag: 'visit-request' };
  return null;
};

const encoder = new TextEncoder();

const base64Url = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
};

const signature = async (expires, secret) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`house-office:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(String(expires)));
  return base64Url(new Uint8Array(signed));
};

const safeEqual = (left, right) => {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index] || 0) ^ (b[index] || 0);
  }
  return mismatch === 0;
};

const cookieValue = (request, name) => {
  const cookies = request.headers.get('Cookie') || '';
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
};

const hasValidSession = async (request, secret) => {
  const session = cookieValue(request, COOKIE_NAME);
  const [expiresText, suppliedSignature] = session.split('.');
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires <= Math.floor(Date.now() / 1000) || !suppliedSignature) return false;
  const expectedSignature = await signature(expires, secret);
  return safeEqual(suppliedSignature, expectedSignature);
};

const loginPage = (message = '', returnPath = '/office') => new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Enter the House Office | The House of Kalli</title>
  <style>
    :root{color-scheme:light;--ink:#28231f;--paper:#f5f1ea;--line:#ded4c8;--bronze:#9a6c45}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--paper);color:var(--ink);font-family:Arial,sans-serif}
    main{width:min(430px,100%);background:#fffdfa;border:1px solid var(--line);border-radius:14px;padding:46px 42px;box-shadow:0 18px 60px rgba(55,43,34,.08)}
    .mark{width:46px;height:46px;border:1px solid var(--bronze);display:grid;place-items:center;margin-bottom:34px;color:var(--bronze);font:25px Georgia,serif}
    .eyebrow{margin:0 0 12px;color:var(--bronze);font-size:9px;font-weight:700;letter-spacing:.24em}h1{margin:0;font:42px/1.05 Georgia,serif;font-weight:400}p{color:#837970;font-size:13px;line-height:1.6;margin:14px 0 30px}
    label span{display:block;margin-bottom:8px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}input{width:100%;height:49px;border:1px solid var(--line);border-radius:7px;background:white;padding:0 14px;font-size:17px;outline:none}input:focus{border-color:var(--bronze);box-shadow:0 0 0 3px rgba(154,108,69,.11)}
    button{width:100%;height:49px;border:0;border-radius:7px;background:#2a2521;color:#fffaf4;margin-top:14px;font-size:11px;font-weight:700;letter-spacing:.12em;cursor:pointer}button:hover{background:#3b332d}.error{margin:15px 0 0;color:#9d3d34;font-size:12px}
    small{display:block;text-align:center;color:#aaa098;font-size:10px;margin-top:25px}@media(max-width:480px){main{padding:38px 27px}h1{font-size:36px}}
  </style>
</head>
<body>
  <main>
    <div class="mark">K</div>
    <p class="eyebrow">THE HOUSE OFFICE</p>
    <h1>Welcome back, Kalli.</h1>
    <p>Enter your private office password to continue.</p>
    <form method="post" action="${returnPath}">
      <label><span>Office password</span><input type="password" name="password" autocomplete="current-password" autofocus required></label>
      <button type="submit">ENTER THE OFFICE</button>
      ${message ? `<div class="error" role="alert">${message}</div>` : ''}
    </form>
    <small>This private session closes automatically after 12 hours.</small>
  </main>
</body>
</html>`, {
  status: message ? 401 : 200,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  },
});

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const notification = notificationFor(url.pathname, context.request.method);
  const isOfficePage = OFFICE_PATHS.has(url.pathname);
  const isOfficeApi = url.pathname.startsWith('/api/office-');
  if (!isOfficePage && !isOfficeApi) {
    const response = await context.next();
    if (notification && response.ok) context.waitUntil(sendHousePush(context.env, notification));
    return response;
  }

  const secret = context.env.VAULT_ADMIN_SECRET;
  if (!secret) return new Response('The House Office password has not been configured.', { status: 503 });

  if (isOfficePage && context.request.method === 'POST') {
    let submitted = '';
    try {
      const form = await context.request.formData();
      submitted = String(form.get('password') || '');
    } catch {
      return loginPage('Please try again.', url.pathname);
    }

    if (!safeEqual(submitted, secret)) {
      return loginPage('That password was not recognised.', url.pathname);
    }

    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const token = `${expires}.${await signature(expires, secret)}`;
    return new Response(null, {
      status: 303,
      headers: {
        Location: url.pathname === '/guests' || url.pathname === '/guests.html'
          ? '/guests'
          : url.pathname === '/collections' || url.pathname === '/collections.html'
            ? '/collections'
            : url.pathname === '/orders' || url.pathname === '/orders.html'
              ? '/orders'
              : url.pathname === '/visits' || url.pathname === '/visits.html'
                ? '/visits'
                : url.pathname === '/correspondence' || url.pathname === '/correspondence.html'
                  ? '/correspondence'
                  : url.pathname === '/journal' || url.pathname === '/journal.html'
                    ? '/journal'
                    : url.pathname === '/finances' || url.pathname === '/finances.html'
                      ? '/finances'
                      : url.pathname === '/customs' || url.pathname === '/customs.html'
                        ? '/customs'
                      : url.pathname === '/settings' || url.pathname === '/settings.html'
                        ? '/settings'
                      : '/office',
        'Cache-Control': 'no-store',
        'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
      },
    });
  }

  if (isOfficePage && context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, HEAD, POST' } });
  }

  if (await hasValidSession(context.request, secret)) {
    const response = await context.next();
    const secured = new Response(response.body, response);
    secured.headers.set('Cache-Control', 'no-store, private');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'no-referrer');
    return secured;
  }

  if (isOfficeApi) {
    return Response.json({ error: 'Your Office session has expired.' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }

  return loginPage('', url.pathname);
}
