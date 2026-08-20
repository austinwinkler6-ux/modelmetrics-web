"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AllPicksResponse, PlayerPropPick, LolPick, SubscriptionStatus } from "./types";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import { PropCard, LolCard, TierBadge } from "@/components/PickCards";
import TrialEndedContent from "@/components/TrialEndedContent";
import { SPORT_LABELS, SPORT_BET_CODES } from "@/lib/sportConstants";
import { easternDateStr } from "@/lib/dateUtils";

/* ───────────────────────────────────────────
   Play of the Day — featured hero card
   ─────────────────────────────────────────── */
function PlayOfTheDay({ pick, sportKey }: { pick: PlayerPropPick | LolPick; sportKey: string }) {
  const isLol = "home_team" in pick;
  const label = SPORT_LABELS[sportKey] || sportKey.toUpperCase();

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-mm-accent animate-pulse" />
        <span className="text-mm-accent font-mono text-[11px] tracking-[0.15em] uppercase font-semibold">
          Play of the Day
        </span>
      </div>

      <div className="relative rounded-2xl bg-gradient-to-br from-mm-panel via-mm-panel to-mm-accent/[0.04] border border-mm-accent/20 p-6 sm:p-8 overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-mm-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-mm-accent/10 text-mm-accent border border-mm-accent/20">
              {label}
            </span>
            <TierBadge tier={pick.mm_tier} />
          </div>

          {isLol ? (
            <>
              <div className="font-display text-2xl sm:text-3xl font-bold text-mm-text mb-1">
                {(pick as LolPick).predicted_winner}
              </div>
              <div className="text-sm text-mm-text-faint mb-5">
                {(pick as LolPick).home_team} vs {(pick as LolPick).away_team}
              </div>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-mm-text-faint text-[10px] font-mono uppercase tracking-wider mb-1">Pick</div>
                  <div className="font-mono text-lg font-semibold text-mm-text">
                    {(pick as LolPick).recommended_pick}
                  </div>
                </div>
                {(pick as LolPick).model_probability != null && (
                  <div>
                    <div className="text-mm-text-faint text-[10px] font-mono uppercase tracking-wider mb-1">Win Prob</div>
                    <div className="font-mono text-lg font-semibold text-mm-text">
                      {((pick as LolPick).model_probability! * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
                {pick.ev_pct != null && (
                  <div>
                    <div className="text-mm-text-faint text-[10px] font-mono uppercase tracking-wider mb-1">Edge</div>
                    <div className="font-mono text-2xl font-bold text-mm-accent">
                      {pick.ev_pct >= 0 ? "+" : ""}{pick.ev_pct}%
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-2xl sm:text-3xl font-bold text-mm-text mb-1">
                {(pick as PlayerPropPick).player}
              </div>
              <div className="text-sm text-mm-text-faint mb-5">
                {(pick as PlayerPropPick).matchup}
              </div>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-mm-text-faint text-[10px] font-mono uppercase tracking-wider mb-1">Pick</div>
                  <div className="font-mono text-lg font-semibold text-mm-text">
                    {(pick as PlayerPropPick).recommended_pick}
                    {(pick as PlayerPropPick).line != null && <span> {(pick as PlayerPropPick).line}</span>}
                  </div>
                </div>
                {(pick as PlayerPropPick).projection != null && (
                  <div>
                    <div className="text-mm-text-faint text-[10px] font-mono uppercase tracking-wider mb-1">Projection</div>
                    <div className="font-mono text-lg font-semibold text-mm-text">
                      {(pick as PlayerPropPick).projection}
                    </div>
                  </div>
                )}
                {pick.ev_pct != null && (
                  <div>
                    <div className="text-mm-text-faint text-[10px] font-mono uppercase tracking-wider mb-1">Edge</div>
                    <div className="font-mono text-2xl font-bold text-mm-accent">
                      {pick.ev_pct >= 0 ? "+" : ""}{pick.ev_pct}%
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

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
      title: "We collect the data",
      body: "Live odds from every major sportsbook, player stats, matchup history, and market prices — all pulled automatically, every two hours.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      ),
      title: "Our models find the edge",
      body: "Sport-specific projection models calculate expected outcomes and compare them to sportsbook lines. When the model disagrees with the market, that's your edge.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "You get the picks",
      body: "Every pick comes with a tier rating, EV%, recommended stake, and a full breakdown of why the model likes it. Compare odds across books to find the best price.",
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
            <h3 className="font-display font-semibold text-mm-text mb-3">Data-driven, not gut-driven</h3>
            <p className="text-[13px] text-mm-text-dim leading-relaxed mb-4">
              Model Metrics is a sports analytics platform built by bettors who got tired of relying on hunches.
              Every pick on this site is generated by a quantitative model — no tipsters, no narratives, no bias.
            </p>
            <p className="text-[13px] text-mm-text-dim leading-relaxed">
              We cover MLB strikeouts, NBA points and assists, NFL passing props, and League of Legends match winners.
              Each sport has its own purpose-built model trained on real historical data.
            </p>
          </div>
          <div>
            <h3 className="font-display font-semibold text-mm-text mb-3">What makes us different</h3>
            <p className="text-[13px] text-mm-text-dim leading-relaxed mb-4">
              Most betting sites give you a pick and say "trust me." We show you exactly why the model likes a bet —
              the projection, the edge, the probability, and how it compares across every sportsbook.
            </p>
            <p className="text-[13px] text-mm-text-dim leading-relaxed">
              We track every pick we make and publish our results. If the model is wrong, you'll see it. No hiding
              losing streaks, no selective reporting. Full transparency, always.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Sports covered strip
   ─────────────────────────────────────────── */
function SportsCovered() {
  const sports = [
    { name: "MLB Strikeouts", emoji: "⚾" },
    { name: "NBA Points", emoji: "🏀" },
    { name: "NBA Assists", emoji: "🏀" },
    { name: "NFL Pass Attempts", emoji: "🏈" },
    { name: "NFL Completions", emoji: "🏈" },
    { name: "NFL Receptions", emoji: "🏈" },
    { name: "LoL Esports", emoji: "🎮" },
  ];

  return (
    <section className="mb-16">
      <h2 className="font-display text-xl font-bold text-mm-text mb-6">What We Cover</h2>
      <div className="flex flex-wrap gap-3">
        {sports.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mm-panel border border-mm-border text-sm text-mm-text-dim"
          >
            <span>{s.emoji}</span>
            <span className="font-mono text-[12px]">{s.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   Main page
   ─────────────────────────────────────────── */
export default function Home() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<AllPicksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const [betNames, setBetNames] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!user || !sub || sub.status === "expired") return;
    fetch("/api/picks?sport=all")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch((e) => setError(String(e)));
  }, [user, sub]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/bets", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        const today = easternDateStr();
        const names = new Set<string>();
        for (const b of json.bets || []) {
          if (b.date === today) {
            names.add(b.pitcher?.toLowerCase() || "");
          }
        }
        setBetNames(names);
      })
      .catch(() => {});
  }, [session]);

  function isAlreadyBet(pick: PlayerPropPick | LolPick): boolean {
    if ("home_team" in pick) {
      const name = `${pick.home_team} vs ${pick.away_team}`.toLowerCase();
      return betNames.has(name);
    }
    return betNames.has(((pick as PlayerPropPick).player || "").toLowerCase());
  }

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

  /* ─── Find Play of the Day ─── */
  function getPlayOfTheDay(): { pick: PlayerPropPick | LolPick; sportKey: string } | null {
    if (!data) return null;
    let bestPick: PlayerPropPick | LolPick | null = null;
    let bestSport = "";
    let bestScore = -Infinity;

    for (const [sportKey, picks] of Object.entries(data.sports)) {
      for (const pick of picks) {
        // Tier priority: Best Bet > Worth a Look > Lean
        const tierScore = pick.mm_tier === "🟢 Best Bet" ? 100 : pick.mm_tier === "🟡 Worth a Look" ? 50 : 0;
        const evScore = pick.ev_pct ?? 0;
        const score = tierScore + evScore;
        if (score > bestScore) {
          bestScore = score;
          bestPick = pick;
          bestSport = sportKey;
        }
      }
    }
    return bestPick ? { pick: bestPick, sportKey: bestSport } : null;
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
        {/* Hero */}
        <div className="text-center mb-16 pt-8">
          <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-4 font-semibold">
            Player Prop Analytics
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-mm-text tracking-tight mb-4">
            Sharp Data.<br />Sharp Bets.
          </h1>
          <p className="text-mm-text-dim text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Quantitative models for MLB, NBA, NFL, and esports. Every pick backed by data, every edge measured.
          </p>
        </div>

        {/* Login */}
        <div className="mb-16">
          <LoginForm />
        </div>

        {/* How it works + About — visible to everyone */}
        <HowItWorks />
        <SportsCovered />
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
            Player Prop Analytics
          </div>
          <h1 className="font-display text-3xl font-bold text-mm-text mb-3">Your trial has ended</h1>
          <p className="text-mm-text-dim mb-6 max-w-md mx-auto">
            Subscribe to unlock full access to all picks, recommended stakes, and bet tracking.
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

  // ─── Logged in — main dashboard ───
  const playOfTheDay = getPlayOfTheDay();

  const allPicks = data ? Object.values(data.sports).flat() : [];
  const evValues = allPicks.map((p) => p.ev_pct).filter((v): v is number => v != null);
  const avgEdge = evValues.length > 0 ? evValues.reduce((a, b) => a + b, 0) / evValues.length : null;
  const bestBetCount = allPicks.filter((p) => p.mm_tier === "🟢 Best Bet").length;
  const todayStr = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      {sub?.status === "trialing" && (
        <div className="text-center mb-4 text-mm-accent font-mono text-xs">
          {sub.days_left_in_trial} day{sub.days_left_in_trial === 1 ? "" : "s"} left in your free trial
        </div>
      )}

      {/* Hero tagline */}
      <div className="text-center mb-10">
        <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-3">
          Player Prop Analytics
        </div>
        <h1 className="font-display text-5xl font-bold text-mm-text tracking-tight">Sharp Data. Sharp Bets.</h1>
      </div>

      {/* Signal strip */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Live Signals</span>
              <span className="w-7 h-7 rounded-lg bg-mm-accent/15 flex items-center justify-center text-mm-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-mm-text mm-tabular">{data.total_count}</div>
          </div>

          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Avg Edge</span>
              <span className="w-7 h-7 rounded-lg bg-mm-success/15 flex items-center justify-center text-mm-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-mm-success mm-tabular">
              {avgEdge != null ? `${avgEdge >= 0 ? "+" : ""}${avgEdge.toFixed(1)}%` : "—"}
            </div>
          </div>

          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Best Bets</span>
              <span className="w-7 h-7 rounded-lg bg-mm-accent/15 flex items-center justify-center text-mm-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-mm-text mm-tabular">{bestBetCount}</div>
          </div>

          <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Today</span>
              <span className="w-7 h-7 rounded-lg bg-mm-panel-2 flex items-center justify-center text-mm-text-dim">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
              </span>
            </div>
            <div className="font-mono text-lg font-bold text-mm-text">{todayStr}</div>
          </div>
        </div>
      )}

      {/* Play of the Day */}
      {playOfTheDay && (
        <PlayOfTheDay pick={playOfTheDay.pick} sportKey={playOfTheDay.sportKey} />
      )}

      {error && (
        <div className="text-center text-mm-danger font-mono text-sm mb-8">{error}</div>
      )}

      {data?.errors && Object.keys(data.errors).length > 0 && (
        <div className="mb-8 p-4 rounded-xl border border-mm-danger/30 bg-mm-danger/5">
          <div className="text-mm-danger font-mono text-xs mb-2">⚠️ Some sports had errors loading:</div>
          {Object.entries(data.errors).map(([sport, msg]) => (
            <div key={sport} className="text-xs text-mm-text-dim font-mono">
              {sport}: {msg}
            </div>
          ))}
        </div>
      )}

      {!data && !error && (
        <div className="text-center text-mm-text-dim font-mono text-sm">Loading today&apos;s picks...</div>
      )}

      {/* All picks by sport */}
      {data &&
        Object.entries(data.sports).map(([sportKey, picks]) => {
          if (!picks || picks.length === 0) return null;
          return (
            <section key={sportKey} className="mb-10">
              <div className="flex justify-between items-baseline mb-4">
                <h2 className="font-display text-lg font-semibold text-mm-text">
                  {SPORT_LABELS[sportKey] || sportKey}
                  <span className="ml-2 text-xs font-mono text-mm-text-faint align-middle">{picks.length}</span>
                </h2>
                <Link href={`/${sportKey}`} className="text-xs font-mono text-mm-text-faint hover:text-mm-accent">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sportKey === "lol"
                  ? (picks as LolPick[]).map((p, i) => <LolCard key={i} pick={p} alreadyBet={isAlreadyBet(p)} />)
                  : (picks as PlayerPropPick[]).map((p, i) => <PropCard key={i} pick={p} sportLabel={SPORT_BET_CODES[sportKey] || "MLB"} alreadyBet={isAlreadyBet(p)} />)}
              </div>
            </section>
          );
        })}

      {data && (
        <div className="text-center text-mm-text-faint font-mono text-xs mt-12 mb-16">
          {data.total_count} total picks · updated {new Date(data.time).toLocaleTimeString()}
        </div>
      )}

      {/* How it works + About — below picks for logged-in users */}
      <HowItWorks />
      <AboutSection />

      <footer className="text-center text-mm-text-faint font-mono text-[10px] pb-8">
        © {new Date().getFullYear()} Model Metrics
      </footer>
    </main>
  );
}
