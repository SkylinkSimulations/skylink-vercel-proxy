// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ORIGIN = 'https://www.skylinksimulations.com';

function rewriteLocation(loc: string, hostOrigin: string) {
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

export default async (req: VercelRequest, res: VercelResponse) => {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host as string;
  const hostOrigin = `${proto}://${host}`;
  const path = req.url || '/';
  const upstream = new URL(path, ORIGIN);

  // Build headers for upstream
  const h = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) h.set(k, v.join(', '));
    else if (v) h.set(k, v as string);
  }
  h.set('Host', new URL(ORIGIN).host);
  h.set('Origin', ORIGIN);
  h.set('Referer', ORIGIN);
  h.delete('accept-encoding'); // simplify body handling

  const init: RequestInit = {
    method: req.method,
    headers: h,
    redirect: 'manual',
    body: ['GET', 'HEAD'].includes((req.method || 'GET').toUpperCase()) ? undefined : (req as any),
  };

  const upstreamRes = await fetch(upstream.toString(), init);

  // Handle redirects
  if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
    const loc = upstreamRes.headers.get('location') || '/';
    res.status(upstreamRes.status).setHeader('Location', rewriteLocation(loc, hostOrigin));
    return res.end();
  }

  // Copy headers (strip some that may cause issues)
  const headersToSend: Record<string, string | string[]> = {};
  upstreamRes.headers.forEach((v, k) => {
    if (/^content-security-policy$/i.test(k)) return;
    if (/^x-frame-options$/i.test(k)) return;
    if (/^transfer-encoding$/i.test(k)) return;
    headersToSend[k] = v;
  });

  // Rewrite Set-Cookie domain
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

    // Replace absolute origin with our host origin
    const originOrigin = new URL(ORIGIN).origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reAbs = new RegExp(originOrigin, 'g');
    html = html.replace(reAbs, hostOrigin);

    res.status(upstreamRes.status);
    for (const [k, v] of Object.entries(headersToSend)) res.setHeader(k, v as any);
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.send(html);
  } else {
    // Binary/text passthrough for assets/api calls
    res.status(upstreamRes.status);
    for (const [k, v] of Object.entries(headersToSend)) res.setHeader(k, v as any);
    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    return res.send(buf);
  }
};
