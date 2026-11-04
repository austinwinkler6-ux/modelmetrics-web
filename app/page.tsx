"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SubscriptionStatus } from "./types";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import TrialEndedContent from "@/components/TrialEndedContent";

/* ───────────────────────────────────────────
   Small helpers
   ─────────────────────────────────────────── */
const BOOK_LABELS: Record<string, string> = {
  betmgm: "BetMGM", williamhill_us: "Caesars", courtside: "Courtside", draftkings: "DraftKings", fanduel: "FanDuel",
  fanatics: "Fanatics", hardrockbet: "Hard Rock", espnbet: "theScore Bet", betrivers: "BetRivers", bovada: "Bovada",
  rebet: "Rebet", ballybet: "Bally Bet", betparx: "betPARX", fliff: "Fliff",
};
const bookLabel = (b: string) => BOOK_LABELS[b] || b;
const fmtOdds = (o: number) => (o > 0 ? `+${o}` : `${o}`);
const SPORT_LABELS: Record<string, string> = { nfl: "NFL", nba: "NBA", mlb: "MLB" };

type TopPick = {
  id: string; sport: string; event: string; player: string; pick: string; book: string; odds: number;
  fair_odds: number; ev_pct: number; market: string;
};
type EvSummary = { total_live: number; picks: TopPick[]; last_updated: string | null; facets?: { sports: Record<string, number> } };

/* ───────────────────────────────────────────
   How It Works — 3-step explainer
   ─────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      ),
      title: "We scan the market",
      body: "Player-prop prices from the sharpest books and from the soft books you actually bet at, refreshed all day and more often as games get close.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      ),
      title: "We find the fair price",
      body: "Sharp books take the biggest bets and have the most accurate lines. We strip out their vig and blend them, Pinnacle weighted most, into one fair price for every prop.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "You see what's mispriced",
      body: "When a soft book pays more than the fair price says it should, it shows up with its EV%, the fair odds, a suggested stake, and every book's price side by side.",
    },
  ];

  return (
    <section className="mb-16">
      <h2 className="font-display text-xl font-bold text-mm-text mb-6">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((step, i) => (
          <div key={i} className="rounded-xl bg-mm-panel border border-mm-border p-5">
            <div className="w-9 h-9 rounded-lg bg-mm-accent/10 flex items-center justify-center text-mm-accent mb-4">
              {step.icon}
            </div>
            <h3 className="font-display font-semibold text-mm-text text-sm mb-2">{step.title}</h3>
            <p className="text-[13px] text-mm-text-dim leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   About section
   ─────────────────────────────────────────── */
function AboutSection() {
  return (
    <section className="mb-16">
      <h2 className="font-display text-xl font-bold text-mm-text mb-6">About Model Metrics</h2>
      <div className="rounded-xl bg-mm-panel border border-mm-border p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-display font-semibold text-mm-text mb-3">We measure prices, not predict games</h3>
            <p className="text-[13px] text-mm-text-dim leading-relaxed mb-4">
              Model Metrics is a +EV finder. We don&apos;t guess who will go over or under. We compare what each sportsbook
              is paying with the fair price set by the sharpest books in the market, and show you where the gap is.
            </p>
            <p className="text-[13px] text-mm-text-dim leading-relaxed">
              +EV means a bet that wins more often than its odds imply. It is a long-run edge, not a guaranteed win, so
              expect losing bets and size them sensibly.
            </p>
          </div>
          <div>
            <h3 className="font-display font-semibold text-mm-text mb-3">Everything is shown, nothing is hidden</h3>
            <p className="text-[13px] text-mm-text-dim leading-relaxed mb-4">
              Every pick shows how the fair price was built, how confident we are in it, and the price at every book,
              so you can check the work and shop for the best number yourself.
            </p>
            <p className="text-[13px] text-mm-text-dim leading-relaxed">
              We also track how our flagged prices compare with the sharp closing line once games start, and publish
              that on the +EV Board, good or bad.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Coverage
   ─────────────────────────────────────────── */
function Coverage() {
  const sports = [
    { name: "NFL", detail: "Every player prop market", emoji: "🏈" },
    { name: "NBA", detail: "Points, rebounds, assists, threes, PRA, PR, PA, RA", emoji: "🏀" },
    { name: "MLB", detail: "Pitcher and batter props", emoji: "⚾" },
  ];
  const sharps = ["Pinnacle", "FanDuel", "BetOnline"];
  const softs = ["BetMGM", "Caesars", "DraftKings", "FanDuel", "Fanatics", "Fliff", "Courtside", "Rebet", "theScore Bet"];

  return (
    <section className="mb-16">
      <h2 className="font-display text-xl font-bold text-mm-text mb-6">What We Cover</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {sports.map((s) => (
          <div key={s.name} className="rounded-xl bg-mm-panel border border-mm-border p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span>{s.emoji}</span>
              <span className="font-display font-semibold text-mm-text">{s.name}</span>
            </div>
            <div className="text-[13px] text-mm-text-dim">{s.detail}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-mm-panel border border-mm-border p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[10px] font-mono text-mm-text-faint uppercase tracking-wider mb-2">Sharp books set the fair price</div>
          <div className="flex flex-wrap gap-2">
            {sharps.map((b) => (
              <span key={b} className="font-mono text-[12px] px-3 py-1 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text-dim">{b}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono text-mm-text-faint uppercase tracking-wider mb-2">Soft books we check for mispriced lines</div>
          <div className="flex flex-wrap gap-2">
            {softs.map((b) => (
              <span key={b} className="font-mono text-[12px] px-3 py-1 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text-dim">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Main page
   ─────────────────────────────────────────── */
export default function Home() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [ev, setEv] = useState<EvSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);

  function refreshSubscription() {
    if (!session) return;
    setSubLoading(true);
    fetch("/api/subscription", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        setSub(json);
        setSubLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setSubLoading(false);
      });
  }

  useEffect(() => {
    if (!user || !session) return;
    refreshSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" && params.get("session_id")) {
      setConfirmingCheckout(true);
      fetch("/api/confirm-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: params.get("session_id") }),
      })
        .then((res) => res.json())
        .then((json) => {
          window.history.replaceState({}, "", window.location.pathname);
          setConfirmingCheckout(false);
          if (json.success) {
            refreshSubscription();
          } else {
            setError(json.error || "Subscription confirmation failed. Try logging out and back in.");
            refreshSubscription();
          }
        })
        .catch((e) => {
          setError(`Checkout confirmation error: ${String(e)}. Try logging out and back in.`);
          setConfirmingCheckout(false);
        });
    } else if (params.get("checkout") === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // live +EV snapshot for the dashboard (same endpoint the +EV Board uses)
  useEffect(() => {
    if (!user || !session || !sub || sub.status === "expired") return;
    fetch("/api/ev-picks?limit=200", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setEv(json);
      })
      .catch((e) => setError(String(e)));
  }, [user, session, sub]);

  function startCheckout() {
    if (!session) return;
    setCheckoutLoading(true);
    fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ site_url: window.location.origin }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.checkout_url) {
          window.location.href = json.checkout_url;
        } else {
          setError(json.error || "Real error starting checkout.");
          setCheckoutLoading(false);
        }
      })
      .catch((e) => {
        setError(String(e));
        setCheckoutLoading(false);
      });
  }

  // ─── Loading states ───
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-mm-text-dim font-mono text-sm">Loading...</div>
      </main>
    );
  }

  // ─── Not logged in — landing page ───
  if (!user) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <div className="text-center mb-16 pt-8">
          <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-4 font-semibold">
            +EV Player Props
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-mm-text tracking-tight mb-4">
            Sharp Prices.<br />+EV Bets.
          </h1>
          <p className="text-mm-text-dim text-base max-w-lg mx-auto mb-8 leading-relaxed">
            We compare every sportsbook&apos;s player-prop prices to the fair price from the sharpest books in the
            market, and flag the bets that beat it. NFL, NBA, and MLB.
          </p>
        </div>

        <div className="mb-16">
          <LoginForm />
        </div>

        <HowItWorks />
        <Coverage />
        <AboutSection />

        <footer className="text-center text-mm-text-faint font-mono text-[10px] pb-8">
          © {new Date().getFullYear()} Model Metrics
        </footer>
      </main>
    );
  }

  if (confirmingCheckout) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-mm-text-dim font-mono text-sm">Confirming your subscription...</div>
      </main>
    );
  }

  if (subLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-mm-text-dim font-mono text-sm">Checking your account...</div>
      </main>
    );
  }

  if (sub?.status === "expired") {
    return (
      <main className="min-h-screen px-6 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-mm-accent font-mono text-xs tracking-widest uppercase mb-3">
            +EV Player Props
          </div>
          <h1 className="font-display text-3xl font-bold text-mm-text mb-3">Your trial has ended</h1>
          <p className="text-mm-text-dim mb-6 max-w-md mx-auto">
            Subscribe to unlock the full +EV Board, every book&apos;s prices, suggested stakes, and bet tracking.
          </p>
          {error && <div className="text-mm-danger font-mono text-sm mb-4">{error}</div>}
          <button
            onClick={startCheckout}
            disabled={checkoutLoading}
            className="px-8 py-2.5 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold disabled:opacity-50 hover:opacity-90 transition"
          >
            {checkoutLoading ? "..." : "Subscribe"}
          </button>
          <div className="mt-3">
            <button onClick={() => signOut()} className="text-mm-text-faint font-mono text-xs hover:text-mm-text-dim">
              Log out
            </button>
          </div>
        </div>

        <TrialEndedContent />
      </main>
    );
  }

  // ─── Logged in — dashboard ───
  const top = ev?.picks.slice(0, 5) ?? [];
  const bestEdge = ev && ev.picks.length > 0 ? Math.max(...ev.picks.map((p) => p.ev_pct)) : null;
  const gameCount = ev ? new Set(ev.picks.map((p) => p.event)).size : null;
  const todayStr = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      {sub?.status === "trialing" && (
        <div className="text-center mb-4 text-mm-accent font-mono text-xs">
          {sub.days_left_in_trial} day{sub.days_left_in_trial === 1 ? "" : "s"} left in your free trial
        </div>
      )}

      <div className="text-center mb-10">
        <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-3">
          +EV Player Props
        </div>
        <h1 className="font-display text-5xl font-bold text-mm-text tracking-tight mb-5">Sharp Prices. +EV Bets.</h1>
        <Link
          href="/ev"
          className="inline-block px-7 py-2.5 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold hover:brightness-110 transition"
        >
          Open the +EV Board
        </Link>
      </div>

      {/* Signal strip */}
      {ev && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="text-[11px] text-mm-text-faint uppercase tracking-wide mb-3">Live +EV Bets</div>
            <div className="font-mono text-2xl font-bold text-mm-text mm-tabular">{ev.total_live}</div>
          </div>
          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="text-[11px] text-mm-text-faint uppercase tracking-wide mb-3">Best Edge Now</div>
            <div className="font-mono text-2xl font-bold text-mm-success mm-tabular">
              {bestEdge != null ? `+${bestEdge.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="text-[11px] text-mm-text-faint uppercase tracking-wide mb-3">Games With +EV</div>
            <div className="font-mono text-2xl font-bold text-mm-text mm-tabular">{gameCount ?? "—"}</div>
          </div>
          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="text-[11px] text-mm-text-faint uppercase tracking-wide mb-3">Today</div>
            <div className="font-mono text-lg font-bold text-mm-text">{todayStr}</div>
          </div>
        </div>
      )}

      {error && <div className="text-center text-mm-danger font-mono text-sm mb-8">{error}</div>}
      {!ev && !error && <div className="text-center text-mm-text-dim font-mono text-sm mb-12">Loading the board...</div>}

      {/* Top edges right now */}
      {top.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-mm-accent animate-pulse" />
              <span className="text-mm-accent font-mono text-[11px] tracking-[0.15em] uppercase font-semibold">Top edges right now</span>
            </div>
            <Link href="/ev" className="text-xs font-mono text-mm-accent hover:underline">See all →</Link>
          </div>
          <div className="rounded-2xl bg-mm-panel border border-mm-border divide-y divide-mm-border/60">
            {top.map((p) => (
              <Link key={p.id} href="/ev" className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-mm-panel-2/60 transition">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-mm-text truncate">{p.player} <span className="font-mono text-sm text-mm-text-dim">{p.pick}</span></div>
                  <div className="font-mono text-[11px] text-mm-text-faint truncate">
                    {SPORT_LABELS[p.sport] || p.sport} · {p.event}
                  </div>
                </div>
                <div className="flex items-center gap-5 shrink-0 text-right">
                  <div className="hidden sm:block">
                    <div className="font-mono text-[10px] text-mm-text-faint uppercase">Bet at</div>
                    <div className="font-mono text-sm text-mm-text mm-tabular">{bookLabel(p.book)} {fmtOdds(p.odds)}</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="font-mono text-[10px] text-mm-text-faint uppercase">Fair</div>
                    <div className="font-mono text-sm text-mm-text-dim mm-tabular">{fmtOdds(p.fair_odds)}</div>
                  </div>
                  <div className="font-mono text-xl font-bold text-mm-success mm-tabular">+{p.ev_pct.toFixed(1)}%</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <HowItWorks />
      <Coverage />
      <AboutSection />

      <footer className="text-center text-mm-text-faint font-mono text-[10px] pb-8">
        © {new Date().getFullYear()} Model Metrics
      </footer>
    </main>
  );
}
