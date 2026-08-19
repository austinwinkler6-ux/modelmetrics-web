"use client";

import { useState, useEffect, type ReactNode } from "react";
import type { PlayerPropPick, LolPick, MmStakeResult } from "@/app/types";
import { TIER_SIGNAL_COLORS } from "@/lib/sportConstants";
import { useAuth } from "@/lib/AuthContext";
import LogBetButton from "@/components/LogBetButton";

function signalColor(tier: string | null) {
  return tier ? TIER_SIGNAL_COLORS[tier] || "#64748B" : "#64748B";
}

function tierLabel(tier: string | null) {
  return tier ? tier.replace(/^[^\s]+\s/, "") : "Unrated";
}

export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const color = signalColor(tier);
  return (
    <span
      className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}40` }}
    >
      {tierLabel(tier)}
    </span>
  );
}

function GameTime({ startTime }: { startTime?: string | null }) {
  if (!startTime) return null;
  try {
    const dt = new Date(startTime);
    if (isNaN(dt.getTime())) return null;
    const formatted = dt.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
    return (
      <span className="text-[11px] text-mm-text-faint font-mono">{formatted}</span>
    );
  } catch { return null; }
}

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-mm-text font-semibold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function ExpandableSection({ label, open, onToggle, children }: {
  label: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className="border-t border-mm-border/50 pt-2 mt-3">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between text-left text-[11px] font-mono text-mm-text-dim hover:text-mm-text py-1 transition">
        <span>{label}</span>
        <span className={`transition-transform text-mm-text-faint ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="pb-2 pt-1">{children}</div>}
    </div>
  );
}

function WhyLinesDropdown({ whyLines }: { whyLines?: string[] }) {
  const [open, setOpen] = useState(false);
  if (!whyLines || whyLines.length === 0) return null;
  return (
    <ExpandableSection label="💡 Why this bet?" open={open} onToggle={() => setOpen(!open)}>
      <ul className="space-y-1.5">
        {whyLines.map((line, i) => (
          <li key={i} className="text-[11px] text-mm-text-dim leading-relaxed"><BoldText text={line} /></li>
        ))}
      </ul>
    </ExpandableSection>
  );
}

function fmtOdds(o: number | null | undefined) {
  if (o == null) return "—";
  return o > 0 ? `+${o}` : `${o}`;
}

function OddsComparisonDropdown({ bookOdds, direction, oddsApiEventId, oddsApiSport, oddsApiMarket, playerName }: {
  bookOdds?: Array<{ book: string; line: number | null; over: number | null; under: number | null }>;
  direction?: string;
  oddsApiEventId?: string | null;
  oddsApiSport?: string | null;
  oddsApiMarket?: string | null;
  playerName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [liveOdds, setLiveOdds] = useState<Array<{ book: string; line: number | null; over: number | null; under: number | null }> | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFetchedAt, setLiveFetchedAt] = useState<string | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);

  const canFetchLive = !!(oddsApiEventId && oddsApiSport && oddsApiMarket);

  useEffect(() => {
    if (!open || !canFetchLive || liveOdds || liveLoading || liveFailed) return;
    setLiveLoading(true);
    const params = new URLSearchParams({
      event_id: oddsApiEventId!,
      sport: oddsApiSport!,
      market: oddsApiMarket!,
    });
    if (playerName) params.set("player", playerName);
    fetch(`/api/live-odds?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.book_odds && json.book_odds.length > 0) {
          setLiveOdds(json.book_odds);
          setLiveFetchedAt(json.fetched_at || null);
        } else {
          setLiveFailed(true);
        }
      })
      .catch(() => setLiveFailed(true))
      .finally(() => setLiveLoading(false));
  }, [open, canFetchLive, oddsApiEventId, oddsApiSport, oddsApiMarket, playerName, liveOdds, liveLoading, liveFailed]);

  if ((!bookOdds || bookOdds.length === 0) && !canFetchLive) return null;

  // Show live data if we have it, otherwise cached — but NOT cached while live is loading
  const odds = liveOdds || (liveLoading ? [] : (bookOdds || []));
  const isOver = direction === "over" || direction === "Over";
  const bestOdds = odds.length > 0 ? odds.reduce((best, b) => {
    const val = isOver ? b.over : b.under;
    const bestVal = isOver ? best.over : best.under;
    if (val == null) return best;
    if (bestVal == null) return b;
    if (val > 0 && bestVal > 0) return val > bestVal ? b : best;
    if (val < 0 && bestVal < 0) return val > bestVal ? b : best;
    if (val > 0) return b;
    return best;
  }, odds[0]) : null;
  const bestBookName = bestOdds?.book;

  const labelCount = odds.length || (bookOdds?.length ?? 0);
  const labelSuffix = liveOdds ? " · Live" : canFetchLive ? "" : "";

  return (
    <ExpandableSection label={`📊 Compare odds${labelCount ? ` (${labelCount} books${labelSuffix})` : ""}`} open={open} onToggle={() => setOpen(!open)}>
      {liveLoading && (
        <div className="text-[11px] text-mm-text-faint py-2">Fetching live odds...</div>
      )}
      {liveFailed && !liveOdds && bookOdds && bookOdds.length > 0 && (
        <div className="text-[10px] text-mm-text-faint pb-1">Could not fetch live odds — showing cached</div>
      )}
      {odds.length > 0 ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-mm-text-faint border-b border-mm-border/40">
                <th className="text-left py-1.5 px-1.5 font-medium">Book</th>
                <th className="text-center py-1.5 px-1.5 font-medium">Line</th>
                <th className="text-center py-1.5 px-1.5 font-medium">Over</th>
                <th className="text-center py-1.5 px-1.5 font-medium">Under</th>
              </tr>
            </thead>
            <tbody>
              {odds.map((b, i) => {
                const isBest = b.book === bestBookName;
                return (
                  <tr key={i} className={`border-b border-mm-border/20 ${isBest ? "bg-mm-accent/5" : ""}`}>
                    <td className={`py-1.5 px-1.5 text-left ${isBest ? "text-mm-accent font-semibold" : "text-mm-text-dim"}`}>
                      {b.book}{isBest && " ✓"}
                    </td>
                    <td className="py-1.5 px-1.5 text-center text-mm-text">{b.line ?? "—"}</td>
                    <td className={`py-1.5 px-1.5 text-center ${isOver && isBest ? "text-mm-accent font-semibold" : "text-mm-text-dim"}`}>
                      {fmtOdds(b.over)}
                    </td>
                    <td className={`py-1.5 px-1.5 text-center ${!isOver && isBest ? "text-mm-accent font-semibold" : "text-mm-text-dim"}`}>
                      {fmtOdds(b.under)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {liveFetchedAt && (
            <div className="text-[10px] text-mm-text-faint mt-1.5 text-right">
              Updated {new Date(liveFetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
            </div>
          )}
        </div>
      ) : !liveLoading ? (
        <div className="text-[11px] text-mm-text-faint py-2">No odds data available</div>
      ) : null}
    </ExpandableSection>
  );
}

function WhyThisBetSection({ pick }: { pick: PlayerPropPick }) {
  return <WhyLinesDropdown whyLines={pick.why_lines} />;
}

function RecommendedStakeLine({ pick }: { pick: PlayerPropPick }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stake, setStake] = useState<MmStakeResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/mm-stake", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ info: pick._raw_info, result: pick._raw_result || {} }),
    })
      .then((res) => res.json())
      .then((json) => { if (json.error) setError(true); else setStake(json.stake); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  if (loading) return <div className="text-[11px] text-mm-text-faint mt-2">💰 Calculating stake...</div>;
  if (error || !stake) return null;
  if (stake.pass) return <div className="text-[11px] text-mm-text-faint mt-2">💰 Recommended: <span className="text-mm-text-dim">Pass</span></div>;
  return (
    <div className="text-[11px] text-mm-text-dim mt-2">
      💰 Recommended:{" "}
      <span className="font-mono font-semibold text-mm-text">
        ${stake.stake_dollars?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="text-mm-text-faint"> ({stake.stake_units}u)</span>
    </div>
  );
}

export function PropCard({ pick, sportLabel, alreadyBet }: { pick: PlayerPropPick; sportLabel: string; alreadyBet?: boolean }) {
  return (
    <div className="rounded-xl bg-mm-panel border border-mm-border hover:border-mm-border-bright transition-all p-4 sm:p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-mm-panel-2 text-mm-text-faint">{sportLabel}</span>
          <GameTime startTime={pick.start_time} />
        </div>
        <TierBadge tier={pick.mm_tier} />
      </div>

      {/* Player + Matchup */}
      <div className="mb-3">
        <div className="font-display font-bold text-mm-text text-base leading-tight">{pick.player}</div>
        <div className="text-[11px] text-mm-text-faint mt-0.5">{pick.matchup}</div>
      </div>

      {/* Pick line + EV */}
      <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-mm-bg/60 border border-mm-border/50">
        <div>
          <span className="font-mono text-sm font-semibold text-mm-text">
            {pick.recommended_pick}
            {pick.line != null && <span> {pick.line}</span>}
          </span>
          {pick.projection != null && (
            <div className="text-[11px] text-mm-text-faint mt-0.5">
              Proj: <span className="text-mm-text-dim font-mono">{pick.projection}</span>
            </div>
          )}
        </div>
        {pick.ev_pct != null && (
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-mm-accent">
              {pick.ev_pct >= 0 ? "+" : ""}{pick.ev_pct}%
            </div>
            <div className="text-[10px] text-mm-text-faint font-mono">EV</div>
          </div>
        )}
      </div>

      <RecommendedStakeLine pick={pick} />
      <OddsComparisonDropdown
        bookOdds={(pick as any).book_odds}
        direction={pick.over_under ?? undefined}
        oddsApiEventId={(pick as any).odds_api_event_id}
        oddsApiSport={(pick as any).odds_api_sport}
        oddsApiMarket={(pick as any).odds_api_market}
        playerName={pick.player}
      />
      <WhyThisBetSection pick={pick} />

      <div className="mt-3">
        <LogBetButton pick={pick} sportLabel={sportLabel} alreadyBet={alreadyBet} />
      </div>
    </div>
  );
}

function LolRecommendedStakeLine({ pick }: { pick: LolPick }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stake, setStake] = useState<MmStakeResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    const rawInfo = pick._raw_info;
    if (!rawInfo) { setLoading(false); return; }
    fetch("/api/mm-stake", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ info: rawInfo, result: pick._raw_result || {} }),
    })
      .then((res) => res.json())
      .then((json) => { if (json.error) setError(true); else setStake(json.stake); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  if (loading) return <div className="text-[11px] text-mm-text-faint mt-2">💰 Calculating stake...</div>;
  if (error || !stake) return null;
  if (stake.pass) return <div className="text-[11px] text-mm-text-faint mt-2">💰 Recommended: <span className="text-mm-text-dim">Pass</span></div>;
  return (
    <div className="text-[11px] text-mm-text-dim mt-2">
      💰 Recommended:{" "}
      <span className="font-mono font-semibold text-mm-text">
        ${stake.stake_dollars?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="text-mm-text-faint"> ({stake.stake_units}u)</span>
    </div>
  );
}

export function LolCard({ pick, alreadyBet }: { pick: LolPick; alreadyBet?: boolean }) {
  return (
    <div className="rounded-xl bg-mm-panel border border-mm-border hover:border-mm-border-bright transition-all p-4 sm:p-5">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-mm-panel-2 text-mm-text-faint">LoL</span>
          <GameTime startTime={pick.start_time} />
        </div>
        <TierBadge tier={pick.mm_tier} />
      </div>

      <div className="mb-3">
        <div className="font-display font-bold text-mm-text text-base leading-tight">{pick.predicted_winner}</div>
        <div className="text-[11px] text-mm-text-faint mt-0.5">{pick.home_team} vs {pick.away_team}</div>
      </div>

      <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-mm-bg/60 border border-mm-border/50">
        <div>
          <span className="font-mono text-sm font-semibold text-mm-text">{pick.recommended_pick}</span>
          {pick.model_probability != null && (
            <div className="text-[11px] text-mm-text-faint mt-0.5">
              Win prob: <span className="text-mm-text-dim font-mono">{(pick.model_probability * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {pick.ev_pct != null && (
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-mm-accent">
              {pick.ev_pct >= 0 ? "+" : ""}{pick.ev_pct}%
            </div>
            <div className="text-[10px] text-mm-text-faint font-mono">EV</div>
          </div>
        )}
      </div>

      <LolRecommendedStakeLine pick={pick} />
      <WhyLinesDropdown whyLines={pick.why_lines} />

      <div className="mt-3">
        <LogBetButton pick={pick} sportLabel="LOL" alreadyBet={alreadyBet} />
      </div>
    </div>
  );
}
