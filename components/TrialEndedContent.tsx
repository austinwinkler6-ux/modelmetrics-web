"use client";

import { useEffect, useState } from "react";
import type { PlayOfTheDayResponse, ModelPerformanceResponse } from "@/app/types";
import { TIER_SIGNAL_COLORS } from "@/lib/sportConstants";

function signalColor(tier: string | null) {
  return tier ? TIER_SIGNAL_COLORS[tier] || "#64748B" : "#64748B";
}

function tierLabel(tier: string | null) {
  return tier ? tier.replace(/^[^\s]+\s/, "") : "Unrated";
}

// Real, deliberately simplified, read-only teaser card — NOT the
// full, interactive PropCard (no per-card MM Stake auto-fetch, no Log
// button) since a real, non-subscribed viewer can't act on any of
// that yet anyway. Just enough to show real, genuine substance
// before asking someone to subscribe. Always a real player-prop pick
// — LoL is deliberately excluded from Play of the Day entirely.
function PlayOfTheDayCard({ data }: { data: PlayOfTheDayResponse }) {
  if (!data.pick) {
    return (
      <div className="text-center text-mm-text-faint font-mono text-sm py-8">
        No qualifying picks right now — check back once today's games are loaded.
      </div>
    );
  }
  const pick = data.pick;
  const color = signalColor(pick.mm_tier);

  return (
    <div className="rounded-2xl bg-mm-panel border border-mm-border p-5 max-w-md mx-auto">
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-mm-panel-2 text-mm-text-dim">
          {pick.sport}
        </span>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ color, backgroundColor: `${color}1F`, border: `1px solid ${color}55` }}
        >
          {tierLabel(pick.mm_tier)}
        </span>
      </div>
      <div className="text-[11px] text-mm-text-faint uppercase tracking-wide mb-1">Play of the Day</div>
      <div className="font-display font-bold text-mm-text text-xl mb-1">{pick.player}</div>
      <div className="text-xs text-mm-text-faint mb-4">{pick.matchup}</div>
      <div className="border-t border-mm-border pt-3 flex justify-between items-center">
        <span className="font-mono text-sm text-mm-text-dim">{pick.recommended_pick}</span>
        {pick.ev_pct != null && (
          <span className="font-mono text-sm font-semibold" style={{ color: "#3B82F6" }}>
            {pick.ev_pct >= 0 ? "+" : ""}{pick.ev_pct}% EV
          </span>
        )}
      </div>
    </div>
  );
}

function TrackRecordStrip({ data }: { data: ModelPerformanceResponse }) {
  if (data.error || data.total_graded === 0) {
    return (
      <div className="text-center text-mm-text-faint font-mono text-xs">
        Track record building — check back soon as today's picks get graded.
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-center gap-6 mb-2">
        <div className="text-center">
          <div className="font-mono text-2xl font-bold text-mm-text mm-tabular">
            {data.wins}-{data.losses}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-mm-text-faint mt-1">Record</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-2xl font-bold text-mm-success mm-tabular">
            {data.win_rate}%
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-mm-text-faint mt-1">Win Rate</div>
        </div>
        <div className="text-center">
          <div className={`font-mono text-2xl font-bold mm-tabular ${(data.roi_pct ?? 0) >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
            {data.roi_pct != null ? `${data.roi_pct >= 0 ? "+" : ""}${data.roi_pct}%` : "—"}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-mm-text-faint mt-1">ROI</div>
        </div>
      </div>
      <div className="text-center text-[10px] text-mm-text-faint font-mono">
        MLB + NBA, flat 1-unit stakes — NFL and LoL track record coming soon
      </div>
    </div>
  );
}

export default function TrialEndedContent() {
  const [playOfDay, setPlayOfDay] = useState<PlayOfTheDayResponse | null>(null);
  const [performance, setPerformance] = useState<ModelPerformanceResponse | null>(null);

  useEffect(() => {
    fetch("/api/play-of-the-day")
      .then((res) => res.json())
      .then(setPlayOfDay)
      .catch(() => setPlayOfDay({ pick: null }));
    fetch("/api/model-performance")
      .then((res) => res.json())
      .then(setPerformance)
      .catch(() => setPerformance(null));
  }, []);

  return (
    <div className="w-full max-w-2xl mt-10 space-y-10">
      <div>
        <div className="text-center text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
          Today&apos;s Play of the Day
        </div>
        {playOfDay ? (
          <PlayOfTheDayCard data={playOfDay} />
        ) : (
          <div className="text-center text-mm-text-faint font-mono text-xs">Loading...</div>
        )}
      </div>

      <div className="border-t border-mm-border pt-8">
        <div className="text-center text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
          The Model&apos;s Track Record
        </div>
        {performance ? (
          <TrackRecordStrip data={performance} />
        ) : (
          <div className="text-center text-mm-text-faint font-mono text-xs">Loading...</div>
        )}
      </div>
    </div>
  );
}
