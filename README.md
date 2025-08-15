# SkyLink Vercel Proxy (Fixed Runtime)

Deploy steps:
1) Create a GitHub repo and upload these files (keep the `api/` folder).
2) Go to https://vercel.com/new → Import the repo → Deploy.
3) You’ll get a `.vercel.app` URL that proxies https://www.skylinksimulations.com.

This version sets the runtime to `@vercel/node@3` to fix the
“Function Runtimes must have a valid version” build error.
