# SkyLink Vercel Proxy (No-Cloudflare)

This project serves your Wix site (`https://www.skylinksimulations.com`) under a clean Vercel URL so TikTok won't block it.

## Deploy (2 minutes)

1. Create a **new GitHub repo** and upload these files.
2. Go to **https://vercel.com/new** → Import your repo → **Deploy**.
3. You'll get a URL like `https://skylink-vercel-proxy.vercel.app`.
4. Put that URL in your TikTok bio. It will load your Wix site without exposing the blocked root domain.

### Optional: Custom Domain
In Vercel Project → **Settings → Domains** → add your domain (e.g. `flywithskylink.com`) and follow the DNS steps.

## Files
- `api/proxy.ts` — serverless function that proxies and rewrites links/redirects.
- `vercel.json` — routes all paths to the proxy function.
- `package.json` — minimal project descriptor.
