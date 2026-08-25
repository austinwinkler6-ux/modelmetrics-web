"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AllPicksResponse, PlayerPropPick, LolPick, SubscriptionStatus } from "./types";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import { PropCard, LolCard } from "@/components/PickCards";
import TrialEndedContent from "@/components/TrialEndedContent";
import { SPORT_LABELS, SPORT_BET_CODES } from "@/lib/sportConstants";
import { easternDateStr } from "@/lib/dateUtils";

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
    // Real, deliberate order — check subscription status FIRST, before
    // ever fetching real picks. No reason to pull real pick data for a
    // real user whose real trial has already expired.
    if (!user || !session) return;
    refreshSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  useEffect(() => {
    // Real handling of the redirect back from a real Stripe Checkout
    // — same real reasoning as mlb_app.py's own handle_stripe_
    // checkout_return: confirms the real session directly against
    // Stripe's own API (via the api-bridge) rather than trusting the
    // redirect alone, since this real site has no live webhook
    // receiver either.
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
            // Confirm failed — try refreshing subscription anyway in
            // case the row was partially updated, and show the error.
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
    // Real, deliberate choice — only fetch real picks once we know a
    // real, logged-in, currently-subscribed-or-trialing user is
    // asking. No reason to reveal the model's real picks to a real
    // visitor whose real trial has expired.
    if (!user || !sub || sub.status === "expired") return;
    fetch("/api/picks?sport=all")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch((e) => setError(String(e)));
  }, [user, sub]);

  // Fetch today's bets once to show "Already Bet" on matching cards
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

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-mm-text-dim font-mono text-sm">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-mm-accent font-mono text-xs tracking-widest uppercase mb-3">
            Player Prop Analytics
          </div>
          <h1 className="font-display text-4xl font-bold text-mm-text">Sharp Data. Sharp Bets.</h1>
        </div>
        <LoginForm />
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

  // Real, computed readout stats for the new signal-strip hero —
  // derived live from the real, already-loaded picks data, never a
  // separate real fetch of their own.
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

      <div className="text-center mb-8">
        <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-3">
          Player Prop Analytics
        </div>
        <h1 className="font-display text-5xl font-bold text-mm-text tracking-tight">Sharp Data. Sharp Bets.</h1>
      </div>

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

      {error && (
        <div className="text-center text-mm-danger font-mono text-sm mb-8">{error}</div>
      )}

      {data?.errors && Object.keys(data.errors).length > 0 && (
        <div className="mb-8 p-4 rounded-xl border border-mm-danger/30 bg-mm-danger/5">
          <div className="text-mm-danger font-mono text-xs mb-2">⚠️ Some sports had real errors loading:</div>
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
        <div className="text-center text-mm-text-faint font-mono text-xs mt-12">
          {data.total_count} total picks · updated {new Date(data.time).toLocaleTimeString()}
        </div>
      )}
    </main>
  );
}
