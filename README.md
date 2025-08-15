# SkyLink Vercel Proxy (JS, no runtime config)

This version uses a plain Node.js Function (`api/proxy.js`) so you don't need to set any runtime.
Vercel defaults to Node 20. Deploy steps:

1) Upload these files to a GitHub repo.
2) Go to https://vercel.com/new → Import repo → Deploy.
3) Use the `.vercel.app` URL in TikTok.
