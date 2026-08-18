/**
 * worker.js — the real entry point for Cloudflare's current, unified
 * Workers deployment.
 *
 * Proxies a set of real API routes to the real Railway api-bridge,
 * always attaching the real, server-side BRIDGE_API_KEY (never
 * exposed to the browser) and forwarding the real, logged-in user's
 * own Authorization header where relevant. Every other real request
 * falls through to serving the static Next.js export directly
 * (env.ASSETS — configured in wrangler.jsonc to point at ./out).
 *
 * REQUIRED CLOUDFLARE ENVIRONMENT VARIABLES:
 *   BRIDGE_API_URL  — your real Railway api-bridge URL
 *   BRIDGE_API_KEY  — the exact same real key set on that Railway service
 */

const ROUTES = {
  "/api/picks": {
    method: "GET",
    bridgePath: (url) => {
      const sport = url.searchParams.get("sport") || "all";
      return sport === "all" ? "/api/all-picks" : `/api/${sport}-picks`;
    },
    requireAuth: false,
  },
  "/api/subscription": { method: "GET", bridgePath: () => "/api/subscription-status", requireAuth: true },
  "/api/play-of-the-day": { method: "GET", bridgePath: () => "/api/play-of-the-day", requireAuth: false },
  "/api/model-performance": { method: "GET", bridgePath: () => "/api/model-performance", requireAuth: false },
  "/api/checkout": { method: "POST", bridgePath: () => "/api/create-checkout-session", requireAuth: true },
  "/api/confirm-checkout": { method: "POST", bridgePath: () => "/api/confirm-checkout", requireAuth: true },
  "/api/mm-stake": { method: "POST", bridgePath: () => "/api/mm-stake", requireAuth: true },
  "/api/user-settings": { method: null, bridgePath: () => "/api/user-settings", requireAuth: true },  // GET (read) or POST (save) — method not fixed
  "/api/bankroll-transactions": { method: null, bridgePath: () => "/api/bankroll-transactions", requireAuth: true },  // GET (list) or POST (create) — method not fixed
  "/api/billing-portal": { method: "POST", bridgePath: () => "/api/billing-portal", requireAuth: true },
  "/api/bets": { method: null, bridgePath: () => "/api/bets", requireAuth: true },  // GET (list) or POST (create) — method not fixed
};

async function proxy(request, env, bridgePath, requireAuth) {
  let bridgeUrl = env.BRIDGE_API_URL;
  const bridgeKey = env.BRIDGE_API_KEY;
  const userAuth = request.headers.get("Authorization");

  if (!bridgeUrl || !bridgeKey) {
    return new Response(
      JSON.stringify({ error: "BRIDGE_API_URL/BRIDGE_API_KEY not configured on this Worker." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Real, defensive fix — a real, missing "https://" prefix on
  // BRIDGE_API_URL (however it happens to end up that way — a real
  // dashboard edit, a real stale config file, anything) used to
  // produce an "Invalid URL" real fetch failure with no easy way to
  // tell why. Normalizes it here instead, so this real class of
  // config mistake can never break the real site again.
  if (!/^https?:\/\//i.test(bridgeUrl)) {
    bridgeUrl = `https://${bridgeUrl}`;
  }
  bridgeUrl = bridgeUrl.replace(/\/+$/, ""); // strip any real trailing slash too

  if (requireAuth && !userAuth) {
    return new Response(JSON.stringify({ error: "Missing real Authorization header — not logged in." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const headers = { "X-API-Key": bridgeKey };
  if (userAuth) headers["Authorization"] = userAuth;

  const init = { method: request.method, headers };
  if (request.method === "POST" || request.method === "PATCH") {
    headers["Content-Type"] = "application/json";
    init.body = await request.text();
  }

  try {
    const res = await fetch(`${bridgeUrl}${bridgePath}`, init);
    const data = await res.text();
    return new Response(data, { status: res.status, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Real fetch error: ${e.message}` }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Real, direct match for /api/bets/{id} (PATCH/DELETE a specific
    // real bet) — a real, dynamic path the static ROUTES table above
    // can't express directly.
    const betIdMatch = url.pathname.match(/^\/api\/bets\/([^/]+)$/);
    if (betIdMatch) {
      return proxy(request, env, `/api/bets/${betIdMatch[1]}`, true);
    }

    const clvMatch = url.pathname.match(/^\/api\/refresh-closing-line\/([^/]+)$/);
    if (clvMatch) {
      return proxy(request, env, `/api/refresh-closing-line/${clvMatch[1]}`, true);
    }

    const route = ROUTES[url.pathname];
    if (route) {
      const bridgePath = route.bridgePath(url);
      return proxy(request, env, bridgePath, route.requireAuth);
    }

    // Every other real request — just serve the real, static Next.js
    // export directly.
    return env.ASSETS.fetch(request);
  },
};
