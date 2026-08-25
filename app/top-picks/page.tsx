"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AllPicksResponse, PlayerPropPick, LolPick } from "@/app/types";
import { useAuth } from "@/lib/AuthContext";
import { PropCard, LolCard } from "@/components/PickCards";
import { SPORT_LABELS, SPORT_BET_CODES } from "@/lib/sportConstants";
import { easternDateStr } from "@/lib/dateUtils";

export default function TopPicksPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [data, setData] = useState<AllPicksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [betNames, setBetNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    fetch("/api/picks?sport=all")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch((e) => setError(String(e)));
  }, [user]);

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

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-mm-text-dim font-mono text-sm">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-mm-text-dim font-mono text-sm">Log in to view picks.</div>
      </main>
    );
  }

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="text-mm-accent font-mono text-[11px] tracking-[0.15em] uppercase mb-2 font-semibold">
          {todayStr}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-mm-text tracking-tight">
          Today&apos;s Top Picks
        </h1>
        <p className="text-mm-text-dim text-sm mt-2">
          The highest-rated plays from every active model, sorted by tier and edge.
        </p>
      </div>

      {error && (
        <div className="text-center text-mm-danger font-mono text-sm mb-8">{error}</div>
      )}

      {!data && !error && (
        <div className="text-center text-mm-text-dim font-mono text-sm py-20">Loading picks...</div>
      )}

      {data && Object.entries(data.sports).map(([sportKey, picks]) => {
        if (!picks || picks.length === 0) return null;

        const sorted = [...picks].sort((a, b) => {
          const tierOrder = (t: string | null) =>
            t === "🟢 Best Bet" ? 0 : t === "🔵 Worth a Look" ? 1 : t === "🟡 Lean" ? 2 : 3;
          const tierDiff = tierOrder(a.mm_tier) - tierOrder(b.mm_tier);
          if (tierDiff !== 0) return tierDiff;
          return (b.ev_pct ?? 0) - (a.ev_pct ?? 0);
        });
        const topPicks = sorted.slice(0, 3);

        return (
          <section key={sportKey} className="mb-10">
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="font-display text-lg font-semibold text-mm-text">
                {SPORT_LABELS[sportKey] || sportKey}
                <span className="ml-2 text-[11px] font-mono text-mm-text-faint align-middle">
                  showing top 3 of {picks.length}
                </span>
              </h2>
              <Link href={`/${sportKey}`} className="text-[11px] font-mono text-mm-text-faint hover:text-mm-accent">
                View all {picks.length} →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sportKey === "lol"
                ? (topPicks as LolPick[]).map((p, i) => <LolCard key={i} pick={p} alreadyBet={isAlreadyBet(p)} />)
                : (topPicks as PlayerPropPick[]).map((p, i) => (
                    <PropCard key={i} pick={p} sportLabel={SPORT_BET_CODES[sportKey] || "MLB"} alreadyBet={isAlreadyBet(p)} />
                  ))}
            </div>
          </section>
        );
      })}

      {data && (
        <div className="text-center text-mm-text-faint font-mono text-xs mt-8 pb-8">
          {data.total_count} total picks · updated {new Date(data.time).toLocaleTimeString()}
        </div>
      )}
    </main>
  );
}
