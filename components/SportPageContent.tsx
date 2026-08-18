"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import { PropCard, LolCard } from "@/components/PickCards";
import TrialEndedContent from "@/components/TrialEndedContent";
import { SPORT_LABELS, SPORT_BET_CODES } from "@/lib/sportConstants";
import { easternDateStr } from "@/lib/dateUtils";
import type { PlayerPropPick, LolPick, SubscriptionStatus } from "@/app/types";

interface SinglePicksResponse {
  picks: PlayerPropPick[] | LolPick[];
  count: number;
  last_updated: string | null;
  error?: string;
}

export default function SportPageContent({ sportKey }: { sportKey: string }) {
  const { user, session, loading: authLoading } = useAuth();
  const [data, setData] = useState<SinglePicksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [betNames, setBetNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !session) return;
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
  }, [user, session]);

  useEffect(() => {
    // Real, deliberate difference from Home's own /api/picks?sport=all
    // — this real page only ever asks for its OWN, single real sport,
    // so it never pulls or waits on every other real sport's data
    // just to show one focused, real page.
    if (!user || !sub || sub.status === "expired") return;
    fetch(`/api/picks?sport=${sportKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch((e) => setError(String(e)));
  }, [user, sub, sportKey]);

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
    return betNames.has((pick.player || "").toLowerCase());
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
        <h1 className="font-display text-2xl font-bold text-mm-text text-center mb-8">
          {SPORT_LABELS[sportKey] || sportKey}
        </h1>
        <LoginForm />
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
          <h1 className="font-display text-3xl font-bold text-mm-text mb-3">Your trial has ended</h1>
          <p className="text-mm-text-dim mb-6 max-w-md mx-auto">
            Subscribe to unlock full access to all picks, recommended stakes, and bet tracking.
          </p>
          <Link href="/settings" className="px-8 py-2.5 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold hover:opacity-90 transition">
            Go to Settings
          </Link>
        </div>

        <TrialEndedContent />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Today&apos;s Signals</div>
        <h1 className="font-display text-4xl font-bold text-mm-text tracking-tight">{SPORT_LABELS[sportKey] || sportKey}</h1>
      </div>

      {error && <div className="text-center text-mm-danger font-mono text-sm mb-8">{error}</div>}
      {data?.error && <div className="text-center text-mm-danger font-mono text-sm mb-8">{data.error}</div>}

      {!data && !error && (
        <div className="text-center text-mm-text-dim font-mono text-sm">Loading today&apos;s picks...</div>
      )}

      {data && data.picks && data.picks.length === 0 && (
        <div className="text-center text-mm-text-dim font-mono text-sm">No picks available right now.</div>
      )}

      {data && data.picks && data.picks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sportKey === "lol"
            ? (data.picks as LolPick[]).map((p, i) => <LolCard key={i} pick={p} alreadyBet={isAlreadyBet(p)} />)
            : (data.picks as PlayerPropPick[]).map((p, i) => (
                <PropCard key={i} pick={p} sportLabel={SPORT_BET_CODES[sportKey] || "MLB"} alreadyBet={isAlreadyBet(p)} />
              ))}
        </div>
      )}

      {data && (
        <div className="text-center text-mm-text-faint font-mono text-xs mt-12">
          {data.count} pick{data.count === 1 ? "" : "s"}
          {data.last_updated && ` · updated ${new Date(data.last_updated).toLocaleTimeString()}`}
        </div>
      )}
    </main>
  );
}
