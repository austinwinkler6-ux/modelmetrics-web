"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { easternDateStr } from "@/lib/dateUtils";
import type { PlayerPropPick, LolPick, MmStakeResult } from "@/app/types";

export default function LogBetButton({ pick, sportLabel, alreadyBet }: { pick: PlayerPropPick | LolPick; sportLabel: string; alreadyBet?: boolean }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loadingStake, setLoadingStake] = useState(false);
  const [stake, setStake] = useState<MmStakeResult | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [betOdds, setBetOdds] = useState("");
  const [betLine, setBetLine] = useState("");
  const [logged, setLogged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLol = "home_team" in pick;
  const playerName = isLol ? `${pick.home_team} vs ${pick.away_team}` : pick.player;
  const odds = isLol ? pick.market_odds : pick.market_odds;
  const evPct = pick.ev_pct;
  const mmTier = pick.mm_tier;

  function authHeader() {
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  function handleOpen() {
    setOpen(true);
    if (odds != null && !betOdds) {
      setBetOdds(String(odds));
    }
    if (!isLol && !betLine) {
      const pickLine = (pick as PlayerPropPick).line;
      if (pickLine != null) setBetLine(String(pickLine));
    }
    if (!isLol && !stake) {
      // Real, deliberate choice — only real player-prop picks have a
      // real "info" dict shaped the way calculate_mm_stake expects.
      // LoL's own real MM Stake logic uses a differently-shaped real
      // stake_info remap (same as mlb_app.py's own LoL log form) —
      // deferred here for now, bet_amount just starts blank for LoL.
      setLoadingStake(true);
      fetch("/api/mm-stake", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ info: (pick as PlayerPropPick)._raw_info, result: (pick as PlayerPropPick)._raw_result || {} }),
      })
        .then((res) => res.json())
        .then((json) => {
          setStake(json.stake);
          if (json.stake && !json.stake.pass && json.stake.stake_dollars) {
            setBetAmount(String(json.stake.stake_dollars));
          }
          setLoadingStake(false);
        })
        .catch(() => setLoadingStake(false));
    }
  }

  function submitBet() {
    if (!betAmount || !betOdds) return;
    const enteredOdds = Number(betOdds);
    setSubmitting(true);
    const payload = isLol
      ? {
          date: easternDateStr(),
          pitcher: playerName,
          sport: "LOL",
          over_under: null,
          odds: enteredOdds,
          bet_amount: Number(betAmount),
          result: "Pending",
          actual: null,
          profit: null,
          ev_pct: evPct,
          mm_tier: mmTier,
        }
      : {
          date: easternDateStr(),
          pitcher: playerName,
          sport: sportLabel,
          over_under: (pick as PlayerPropPick).over_under,
          odds: enteredOdds,
          bet_amount: Number(betAmount),
          bet_line: betLine ? Number(betLine) : null,
          result: "Pending",
          actual: null,
          profit: null,
          projection: (pick as PlayerPropPick).projection,
          ev_pct: evPct,
          mm_tier: mmTier,
          model_prob: (pick as PlayerPropPick).model_probability,
          no_vig_prob: (pick as PlayerPropPick).no_vig_probability,
          mm_stake_recommended: stake?.stake_dollars ?? null,
        };

    fetch("/api/bets", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then(() => {
        setLogged(true);
        setSubmitting(false);
        setOpen(false);
      })
      .catch((e) => {
        setError(String(e));
        setSubmitting(false);
      });
  }

  if (logged) {
    return <span className="text-xs font-mono text-mm-success">✓ Logged</span>;
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {alreadyBet && (
          <span className="text-xs font-mono px-2 py-1 rounded-md bg-mm-accent/15 text-mm-accent border border-mm-accent/30">
            ✓ Already Bet
          </span>
        )}
        <button
          onClick={handleOpen}
          className="text-xs font-mono px-2 py-1 rounded-md border border-mm-border text-mm-text-dim hover:border-mm-accent hover:text-mm-accent"
        >
          📝 Log
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 p-2 rounded-lg border border-mm-border bg-mm-panel-2 text-xs font-mono">
      {loadingStake ? (
        <div className="text-mm-text-faint">Getting stake recommendation...</div>
      ) : (
        <>
          {stake?.pass ? (
            <div className="text-mm-text-faint mb-1">Model says pass on this one.</div>
          ) : stake?.stake_dollars ? (
            <div className="text-mm-accent mb-1">Suggested: ${stake.stake_dollars.toFixed(2)}</div>
          ) : null}
          <div className="flex gap-2">
            <input
              type="number" step="0.01" placeholder="$ amount" value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-20 px-2 py-1 rounded bg-mm-panel border border-mm-border text-mm-text"
            />
            <input
              type="number" step="0.5" placeholder="line" value={betLine}
              onChange={(e) => setBetLine(e.target.value)}
              className="w-16 px-2 py-1 rounded bg-mm-panel border border-mm-border text-mm-text"
            />
            <input
              type="number" step="1" placeholder="odds" value={betOdds}
              onChange={(e) => setBetOdds(e.target.value)}
              className="w-20 px-2 py-1 rounded bg-mm-panel border border-mm-border text-mm-text"
            />
            <button
              onClick={submitBet}
              disabled={submitting || !betAmount || !betOdds}
              className="px-2 py-1 rounded bg-mm-accent text-mm-bg font-semibold disabled:opacity-50"
            >
              {submitting ? "..." : "Confirm"}
            </button>
            <button onClick={() => setOpen(false)} className="px-2 py-1 text-mm-text-faint">
              Cancel
            </button>
          </div>
          {error && <div className="text-mm-danger mt-1">{error}</div>}
        </>
      )}
    </div>
  );
}
