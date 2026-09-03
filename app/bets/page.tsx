"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import { easternDateStr } from "@/lib/dateUtils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Bet } from "../types";

const SPORTS = ["MLB", "NBA", "NBA_AST", "NFL", "NFL_COMPLETIONS", "NFL_RECEPTIONS", "LOL"];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function BetsPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual log form state
  const [showForm, setShowForm] = useState(false);
  const [formPlayer, setFormPlayer] = useState("");
  const [formSport, setFormSport] = useState("MLB");
  const [formOU, setFormOU] = useState("Over");
  const [formOdds, setFormOdds] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function authHeader() {
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  function loadBets() {
    if (!session) return;
    setLoading(true);
    fetch("/api/bets", { headers: authHeader() })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setBets(json.bets || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!user || !session) return;
    loadBets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  function submitBet(e: React.FormEvent) {
    e.preventDefault();
    if (!formPlayer || !formOdds || !formAmount) return;
    setSubmitting(true);
    fetch("/api/bets", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        date: easternDateStr(),
        pitcher: formPlayer,
        sport: formSport,
        over_under: formOU,
        odds: Number(formOdds),
        bet_amount: Number(formAmount),
        result: "Pending",
        actual: null,
        profit: null,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setFormPlayer("");
        setFormOdds("");
        setFormAmount("");
        setShowForm(false);
        setSubmitting(false);
        loadBets();
      })
      .catch((e) => {
        setError(String(e));
        setSubmitting(false);
      });
  }

  function deleteBet(betId: string) {
    fetch(`/api/bets/${betId}`, { method: "DELETE", headers: authHeader() })
      .then(() => loadBets())
      .catch((e) => setError(String(e)));
  }

  const [refreshingClv, setRefreshingClv] = useState<string | null>(null);

  function refreshClosingLine(betId: string) {
    setRefreshingClv(betId);
    fetch(`/api/refresh-closing-line/${betId}`, { method: "POST", headers: authHeader() })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) setError(json.error || "Real error refreshing closing line.");
        setRefreshingClv(null);
        loadBets();
      })
      .catch((e) => {
        setError(String(e));
        setRefreshingClv(null);
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
        <div className="text-center mb-8"><div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Performance</div><h1 className="font-display text-3xl font-bold text-mm-text tracking-tight">Bet Tracker</h1></div>
        <LoginForm />
      </main>
    );
  }

  const wins = bets.filter((b) => b.result === "Win").length;
  const losses = bets.filter((b) => b.result === "Loss").length;
  const totalProfit = bets.reduce((sum, b) => sum + (b.profit || 0), 0);

  // Real, client-side aggregation — only ever computed from bets that
  // already have the real model context (ev_pct/mm_tier), which only
  // real bets logged via the "📝 Log" button on a real pick carry.
  // Real, manually-logged bets (no model context at all) are simply
  // excluded from these two real tables, not counted as some default
  // "unknown" bucket.
  const settledBets = bets.filter((b) => b.result === "Win" || b.result === "Loss");

  function computeBreakdown(groupFn: (b: Bet) => string | null, order: string[]) {
    const groups: Record<string, { wins: number; losses: number; profit: number }> = {};
    for (const b of settledBets) {
      const key = groupFn(b);
      if (!key) continue;
      if (!groups[key]) groups[key] = { wins: 0, losses: 0, profit: 0 };
      if (b.result === "Win") groups[key].wins++;
      else groups[key].losses++;
      groups[key].profit += b.profit || 0;
    }
    const labels = order.filter((l) => groups[l]);
    return labels.map((label) => {
      const g = groups[label];
      const total = g.wins + g.losses;
      return { label, wins: g.wins, losses: g.losses, profit: g.profit, winPct: total > 0 ? (g.wins / total) * 100 : 0 };
    });
  }

  const tierBreakdown = computeBreakdown(
    (b) => b.mm_tier || null,
    ["🟢 Best Bet", "🔵 Worth a Look", "🟡 Lean", "🔴 Pass"]
  );

  const evBreakdown = computeBreakdown((b) => {
    if (b.ev_pct == null) return null;
    if (b.ev_pct < 5) return "0-5%";
    if (b.ev_pct < 10) return "5-10%";
    if (b.ev_pct < 15) return "10-15%";
    return "15%+";
  }, ["0-5%", "5-10%", "10-15%", "15%+"]);

  // Real, deliberate difference from the two tables above — every
  // real bet has a real sport, including manually-logged ones with no
  // model context at all, so this one isn't limited to picks logged
  // via the "📝 Log" button the way tier/EV% breakdowns are.
  const sportBreakdown = computeBreakdown(
    (b) => b.sport || null,
    SPORTS
  );

  // Real, new addition — cumulative profit over time, for the new
  // real chart. Sorted chronologically ascending (oldest first) since
  // a running total only makes real sense read left-to-right.
  const cumulativeProfitData = (() => {
    const sorted = [...settledBets].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let running = 0;
    return sorted.map((b) => {
      running += b.profit || 0;
      return { date: b.date, profit: Math.round(running * 100) / 100 };
    });
  })();

  const winRateBySportData = sportBreakdown.map((row) => ({
    sport: row.label,
    winRate: Math.round(row.winPct),
  }));

  const betsWithStakeRec = settledBets.filter((b) => b.mm_stake_recommended != null && b.bet_amount != null);
  const mmStakeAdherence = betsWithStakeRec.length > 0 ? (() => {
    const followed = betsWithStakeRec.filter((b) => {
      const rec = b.mm_stake_recommended!;
      const actual = b.bet_amount!;
      return Math.abs(actual - rec) / rec <= 0.15;
    }).length;
    return { followed, total: betsWithStakeRec.length, followedPct: (followed / betsWithStakeRec.length) * 100 };
  })() : null;

  const betsWithClv = bets.filter((b) => b.odds_clv != null);
  const avgClv = betsWithClv.length > 0
    ? betsWithClv.reduce((sum, b) => sum + (b.odds_clv || 0), 0) / betsWithClv.length
    : null;

  return (
    <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <div className="text-center mb-8"><div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Performance</div><h1 className="font-display text-3xl font-bold text-mm-text tracking-tight">Bet Tracker</h1></div>

      {error && <div className="text-center text-mm-danger font-mono text-sm mb-6">{error}</div>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Record</span>
            <span className="w-7 h-7 rounded-lg bg-mm-accent/15 flex items-center justify-center text-mm-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-mm-text mm-tabular">{wins}-{losses}</div>
        </div>
        <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Total Profit</span>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${totalProfit >= 0 ? "bg-mm-success/15 text-mm-success" : "bg-mm-danger/15 text-mm-danger"}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>
            </span>
          </div>
          <div className={`font-mono text-xl font-bold mm-tabular ${totalProfit >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
            {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="rounded-2xl bg-mm-panel border border-mm-border p-4">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] text-mm-text-faint uppercase tracking-wide">Total Bets</span>
            <span className="w-7 h-7 rounded-lg bg-mm-panel-2 flex items-center justify-center text-mm-text-dim">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-mm-text mm-tabular">{bets.length}</div>
        </div>
      </div>

      {cumulativeProfitData.length > 1 && (
        <div className="rounded-2xl bg-mm-panel border border-mm-border p-5 mb-6">
          <div className="font-display font-semibold text-mm-text text-sm mb-1">Cumulative Profit</div>
          <div className="text-xs text-mm-text-faint mb-4">Running total across your settled bets</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cumulativeProfitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232B3D" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#232B3D" }} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#161C2C", border: "1px solid #232B3D", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#F1F5F9" }} />
              <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {winRateBySportData.length > 0 && (
        <div className="rounded-2xl bg-mm-panel border border-mm-border p-5 mb-8">
          <div className="font-display font-semibold text-mm-text text-sm mb-1">Win Rate by Sport</div>
          <div className="text-xs text-mm-text-faint mb-4">Percentage of settled bets won, per sport</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={winRateBySportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232B3D" vertical={false} />
              <XAxis dataKey="sport" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#232B3D" }} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#161C2C", border: "1px solid #232B3D", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#F1F5F9" }} />
              <Bar dataKey="winRate" fill="#22C55E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {settledBets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <h3 className="font-display text-sm font-semibold text-mm-text mb-2">Performance by Tier</h3>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-mm-text-faint text-left border-b border-mm-border">
                  <th className="py-1">Tier</th>
                  <th className="py-1 text-right">Record</th>
                  <th className="py-1 text-right">Win%</th>
                  <th className="py-1 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {tierBreakdown.map((row) => (
                  <tr key={row.label} className="border-b border-mm-border/50">
                    <td className="py-1 text-mm-text-dim">{row.label}</td>
                    <td className="py-1 text-right text-mm-text-dim">{row.wins}-{row.losses}</td>
                    <td className="py-1 text-right text-mm-text-dim">{row.winPct.toFixed(0)}%</td>
                    <td className={`py-1 text-right ${row.profit >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
                      {row.profit >= 0 ? "+" : ""}${row.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-mm-text mb-2">Performance by EV%</h3>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-mm-text-faint text-left border-b border-mm-border">
                  <th className="py-1">EV% Range</th>
                  <th className="py-1 text-right">Record</th>
                  <th className="py-1 text-right">Win%</th>
                  <th className="py-1 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {evBreakdown.map((row) => (
                  <tr key={row.label} className="border-b border-mm-border/50">
                    <td className="py-1 text-mm-text-dim">{row.label}</td>
                    <td className="py-1 text-right text-mm-text-dim">{row.wins}-{row.losses}</td>
                    <td className="py-1 text-right text-mm-text-dim">{row.winPct.toFixed(0)}%</td>
                    <td className={`py-1 text-right ${row.profit >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
                      {row.profit >= 0 ? "+" : ""}${row.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-mm-text mb-2">Performance by Sport</h3>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-mm-text-faint text-left border-b border-mm-border">
                  <th className="py-1">Sport</th>
                  <th className="py-1 text-right">Record</th>
                  <th className="py-1 text-right">Win%</th>
                  <th className="py-1 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {sportBreakdown.map((row) => (
                  <tr key={row.label} className="border-b border-mm-border/50">
                    <td className="py-1 text-mm-text-dim">{row.label}</td>
                    <td className="py-1 text-right text-mm-text-dim">{row.wins}-{row.losses}</td>
                    <td className="py-1 text-right text-mm-text-dim">{row.winPct.toFixed(0)}%</td>
                    <td className={`py-1 text-right ${row.profit >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
                      {row.profit >= 0 ? "+" : ""}${row.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mmStakeAdherence && (
        <div className="mb-4 p-3 rounded-lg border border-mm-border bg-mm-panel text-xs font-mono">
          <div className="text-mm-text-faint mb-1">MM Stake Adherence</div>
          <div className="text-mm-text-dim">
            Followed the recommendation on {mmStakeAdherence.followedPct.toFixed(0)}% of bets
            ({mmStakeAdherence.followed}/{mmStakeAdherence.total} within 15% of the suggested stake)
          </div>
        </div>
      )}

      {avgClv != null && (
        <div className="mb-8 p-3 rounded-lg border border-mm-border bg-mm-panel text-xs font-mono">
          <div className="text-mm-text-faint mb-1">Average Closing Line Value (CLV)</div>
          <div className={avgClv >= 0 ? "text-mm-success" : "text-mm-danger"}>
            {avgClv >= 0 ? "+" : ""}{avgClv.toFixed(2)}% across {betsWithClv.length} bet{betsWithClv.length === 1 ? "" : "s"} with a closing line fetched
          </div>
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 px-4 py-2 rounded-lg border border-mm-border text-mm-text-dim font-mono text-sm hover:border-mm-accent hover:text-mm-accent"
      >
        {showForm ? "Cancel" : "+ Log a Bet"}
      </button>

      {showForm && (
        <form onSubmit={submitBet} className="mb-8 p-4 rounded-xl border border-mm-border bg-mm-panel flex flex-col gap-3">
          <input
            placeholder="Player / Matchup"
            value={formPlayer}
            onChange={(e) => setFormPlayer(e.target.value)}
            required
            className="px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text"
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={formSport} onChange={(e) => setFormSport(e.target.value)} className="px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text">
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={formOU} onChange={(e) => setFormOU(e.target.value)} className="px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text">
              <option value="Over">Over</option>
              <option value="Under">Under</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number" placeholder="Odds (e.g. -110)" value={formOdds}
              onChange={(e) => setFormOdds(e.target.value)} required
              className="px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text"
            />
            <input
              type="number" step="0.01" placeholder="Bet Amount ($)" value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)} required
              className="px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text"
            />
          </div>
          <button type="submit" disabled={submitting} className="py-2 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold disabled:opacity-50">
            {submitting ? "..." : "Log Bet"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-mm-text-dim font-mono text-sm">Loading bets...</div>
      ) : bets.length === 0 ? (
        <div className="text-center text-mm-text-dim font-mono text-sm">No bets logged yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {bets.map((bet) => (
            <div key={bet.id} className="p-4 rounded-xl border border-mm-border bg-mm-panel flex justify-between items-center">
              <div>
                <div className="font-display font-semibold text-mm-text">{bet.pitcher}</div>
                <div className="text-xs text-mm-text-faint font-mono">
                  {bet.sport} · {bet.over_under}
                  {(bet as any).bet_line != null && <> {(bet as any).bet_line}</>} ·{" "}
                  {bet.odds && bet.odds > 0 ? "+" : ""}{bet.odds} · ${bet.bet_amount}
                </div>
                {bet.odds_clv != null ? (
                  <div className={`text-xs font-mono mt-1 ${bet.odds_clv >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
                    CLV: {bet.odds_clv >= 0 ? "+" : ""}{bet.odds_clv}% (closed {bet.closing_odds && bet.closing_odds > 0 ? "+" : ""}{bet.closing_odds})
                  </div>
                ) : bet.sport !== "LOL" ? (
                  <button
                    onClick={() => refreshClosingLine(bet.id)}
                    disabled={refreshingClv === bet.id}
                    className="text-xs font-mono text-mm-text-faint hover:text-mm-accent mt-1 disabled:opacity-50"
                  >
                    {refreshingClv === bet.id ? "Checking..." : "🔄 Get closing line"}
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {bet.result === "Pending" ? (
                  <span className="text-xs font-mono px-2 py-1 rounded-md text-mm-text-faint border border-mm-border">
                    ⏳ Pending — grades automatically after the game
                  </span>
                ) : (
                  <span className={`text-xs font-mono px-2 py-1 rounded-md ${bet.result === "Win" ? "text-mm-success" : bet.result === "Push" ? "text-mm-text-faint" : "text-mm-danger"}`}>
                    {bet.result} {bet.profit != null && `(${bet.profit >= 0 ? "+" : ""}$${bet.profit.toFixed(2)})`}
                  </span>
                )}
                <button onClick={() => deleteBet(bet.id)} className="text-xs text-mm-text-faint hover:text-mm-danger">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
