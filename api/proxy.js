// api/proxy.js
// CommonJS handler for Vercel Node functions (Node.js 20 by default)
const ORIGIN = 'https://www.skylinksimulations.com';

function rewriteLocation(loc, hostOrigin) {
  try {
    const u = new URL(loc, ORIGIN); // handles relative redirects
    if (u.origin === new URL(ORIGIN).origin) {
      return hostOrigin + u.pathname + u.search + u.hash;
    }
    return loc;
  } catch {
    return loc;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const proto = (req.headers['x-forwarded-proto'] || 'https');
  const host = req.headers.host;
  const hostOrigin = `${proto}://${host}`;
  const path = req.url || '/';
  const upstream = new URL(path, ORIGIN);

  // Build headers for upstream
  const h = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (!v) continue;
    const vv = Array.isArray(v) ? v.join(', ') : v.toString();
    h.set(k, vv);
  }
  h.set('Host', new URL(ORIGIN).host);
  h.set('Origin', ORIGIN);
  h.set('Referer', ORIGIN);
  h.delete('accept-encoding'); // simplify

  const method = (req.method || 'GET').toUpperCase();
  const body = ['GET','HEAD'].includes(method) ? undefined : await readBody(req);

  const init = {
    method,
    headers: h,
    redirect: 'manual',
    body
  };

  const upstreamRes = await fetch(upstream.toString(), init);

  // Redirects: rewrite Location
  if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
    const loc = upstreamRes.headers.get('location') || '/';
    res.status(upstreamRes.status).setHeader('Location', rewriteLocation(loc, hostOrigin));
    return res.end();
  }

  // Copy headers (strip some)
  const headersToSend = {};
  upstreamRes.headers.forEach((v, k) => {
    if (/^content-security-policy$/i.test(k)) return;
    if (/^x-frame-options$/i.test(k)) return;
    if (/^transfer-encoding$/i.test(k)) return;
    headersToSend[k] = v;
  });

  // Cookies: rewrite Domain
  const setCookie = upstreamRes.headers.get('set-cookie');
  if (setCookie) {
    const cookies = setCookie.split(/,(?=[^;]+?=)/g).map(c =>
      c.replace(/;\s*Domain=[^;]+/i, `; Domain=${host}`)
    );
    headersToSend['set-cookie'] = cookies;
  }

  const ct = upstreamRes.headers.get('content-type') || '';

  if (ct.includes('text/html')) {
    let html = await upstreamRes.text();
    const originOrigin = new URL(ORIGIN).origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reAbs = new RegExp(originOrigin, 'g');
    html = html.replace(reAbs, hostOrigin);

    res.status(upstreamRes.status);
    for (const [k, v] of Object.entries(headersToSend)) res.setHeader(k, v);
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.send(html);
  } else {
    res.status(upstreamRes.status);
    for (const [k, v] of Object.entries(headersToSend)) res.setHeader(k, v);
    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    return res.send(buf);
  }
};
