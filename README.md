# Model Metrics — Next.js Frontend (Proof of Concept)

A real, fast, properly-routed frontend for Model Metrics, built to
replace Streamlit's page-by-page limitations. This first version is a
single public page showing today's picks across every sport — a real
proof of concept before we build out the rest (auth, individual sport
pages, bet tracker, etc.).

## How this fits together

```
Browser → your Cloudflare Pages site → /api/picks (a Cloudflare Pages
Function, runs server-side) → your real Railway api-bridge → your
real Supabase cache → your real, already-computed picks
```

Your `BRIDGE_API_KEY` never reaches the browser — it's held server-
side in the Cloudflare Pages Function (`functions/api/picks.js`) and
set as a Cloudflare environment variable, not baked into any client
code.

## Local setup (do this on your own machine, not in a sandbox)

```bash
cd modelmetrics-web
npm install
npm run dev
```

Visit `http://localhost:3000`. Note: the `/api/picks` route only works
when deployed to Cloudflare Pages (or run via `npx wrangler pages dev`
locally) — a plain `next dev` won't run the Cloudflare Function. For
now, that's expected; the real test happens once it's deployed.

## Environment variables needed

**Set in Cloudflare Pages → Settings → Environment variables** (build-time, gets baked into the client bundle — these are meant to be public):
- `NEXT_PUBLIC_SUPABASE_URL` — same Supabase project URL your Streamlit app uses
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **anon/public** key (not service_role) from Supabase → Project Settings → API

**Set on the Worker itself → Settings → Variables and secrets** (runtime, stays server-side, never exposed to the browser):
- `BRIDGE_API_URL` — your Railway api-bridge URL
- `BRIDGE_API_KEY` — same key set on that Railway service (mark as **Secret**, not plain text)

## Deploying to Cloudflare (Workers with static assets)

1. Push this folder to a **new** GitHub repo (keep it separate from
   your main Streamlit repo — this is a different project)
2. Go to the Cloudflare dashboard → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**
3. Pick your new repo
4. Build settings:
   - Framework preset: **Next.js (Static HTML Export)**
   - Build command: `npm run build`
   - Build output directory: `out`
5. Before deploying, go to **Settings → Environment variables** and add:
   - `BRIDGE_API_URL` — your real Railway api-bridge URL (e.g.
     `https://api-bridge-production-2007.up.railway.app`)
   - `BRIDGE_API_KEY` — the exact same key you set on that Railway service
6. Deploy. Cloudflare gives you a real `.pages.dev` URL immediately —
   you can add your own custom domain later under **Custom domains**.

## What this proves, and what it doesn't yet

This proves the real, end-to-end chain works: a real static site,
hosted for free, calling your real cached model data securely,
rendering instantly with a real URL. That's the actual hard part.

What it does NOT do yet: no login, no per-sport pages, no bet tracker,
no Stripe. Those are real, separate pieces of work to build once this
foundation is confirmed working.
