"use client";

// +EV Board -> app/ev/page.tsx
// Reads /api/ev-picks (and /api/ev-performance). Every row is a price at a soft book that beats the fair price
// built from the sharp books (Pinnacle, BetOnline, Novig, ProphetX, Polymarket). No projections or models.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import { easternDateStr } from "@/lib/dateUtils";

type Shop = { book: string; odds: number; ev_pct: number | null; sharp?: boolean; ref?: boolean; opp?: number | null };
type Pick = {
  id: string; sport: string; event_id: string; event: string; commence: string; market: string; player: string;
  point: number | null; side: string; pick: string; book: string; odds: number; fair_prob: number; fair_odds: number;
  ev_pct: number; n_sharps: number; single_source: boolean; sharps: Record<string, number>; sharp_spread_pts: number;
  kelly_quarter_pct: number; shop: Shop[]; first_seen: string | null; last_seen: string | null;
  confidence: "high" | "medium" | "low"; age_minutes: number | null; minutes_to_start: number;
};
type Facets = { sports: Record<string, number>; markets: Record<string, number>; books: Record<string, number> };
type Perf = {
  overall: { n: number; avg_ev_at_flag_pct?: number; avg_ev_at_close_pct?: number; pct_positive_at_close?: number };
  by_sport?: Record<string, { n: number; avg_ev_at_flag_pct?: number; avg_ev_at_close_pct?: number; pct_positive_at_close?: number }>;
  error?: string;
};

const BOOK_LABELS: Record<string, string> = {
  betmgm: "BetMGM", williamhill_us: "Caesars", courtside: "Courtside", draftkings: "DraftKings", fanduel: "FanDuel",
  fanatics: "Fanatics", hardrockbet: "Hard Rock", espnbet: "ESPN BET", betrivers: "BetRivers", bovada: "Bovada",
  ballybet: "Bally Bet", betparx: "betPARX", fliff: "Fliff", pinnacle: "Pinnacle", betonlineag: "BetOnline",
  novig: "Novig", prophetx: "ProphetX", polymarket: "Polymarket", lowvig: "LowVig", kalshi: "Kalshi",
};
const SPORT_LABELS: Record<string, string> = { nfl: "NFL", nba: "NBA", mlb: "MLB" };
const MARKET_LABELS: Record<string, string> = {
  player_pass_yds: "Pass Yds", player_pass_tds: "Pass TDs", player_pass_attempts: "Pass Att", player_pass_completions: "Completions",
  player_pass_interceptions: "Interceptions", player_pass_longest_completion: "Longest Completion", player_rush_yds: "Rush Yds",
  player_rush_attempts: "Rush Att", player_rush_longest: "Longest Rush", player_receptions: "Receptions", player_reception_yds: "Rec Yds",
  player_reception_longest: "Longest Rec", player_rush_reception_yds: "Rush+Rec Yds", player_pass_rush_yds: "Pass+Rush Yds",
  player_pass_rush_reception_yds: "Pass+Rush+Rec Yds", player_anytime_td: "Anytime TD", player_rush_tds: "Rush TDs",
  player_reception_tds: "Rec TDs", player_tds_over: "TDs (O/U)", player_1st_td: "1st TD", player_last_td: "Last TD",
  player_pass_rush_reception_tds: "Pass+Rush+Rec TDs", player_kicking_points: "Kicking Pts", player_field_goals: "Field Goals",
  player_pats: "PATs", player_sacks: "Sacks", player_solo_tackles: "Solo Tackles", player_tackles_assists: "Tackles+Ast",
  player_assists: "Assists", player_defensive_interceptions: "Def INTs", player_pass_yds_q1: "Pass Yds Q1",
  player_points: "Points", player_rebounds: "Rebounds", player_threes: "3-Pointers", player_blocks: "Blocks",
  player_steals: "Steals", player_turnovers: "Turnovers", player_points_rebounds_assists: "PRA", player_points_rebounds: "PR",
  player_points_assists: "PA", player_rebounds_assists: "RA", player_double_double: "Double-Double", player_triple_double: "Triple-Double",
  pitcher_strikeouts: "Strikeouts", pitcher_outs: "Outs", pitcher_hits_allowed: "Hits Allowed", pitcher_earned_runs: "Earned Runs",
  pitcher_walks: "Walks", batter_hits: "Hits", batter_total_bases: "Total Bases", batter_home_runs: "Home Runs",
  batter_rbis: "RBIs", batter_runs_scored: "Runs", batter_hits_runs_rbis: "H+R+RBI",
};
// NFL "player_assists" and NBA "player_assists" share a key, so the sport decides the label
function marketLabel(market: string, sport: string): string {
  if (market === "player_assists") return sport === "nba" ? "Assists" : "Assists (Def)";
  return MARKET_LABELS[market] || market.replace(/^(player|pitcher|batter)_/, "").replace(/_/g, " ");
}
const bookLabel = (b: string) => BOOK_LABELS[b] || b;
const fmtOdds = (o: number) => (o > 0 ? `+${o}` : `${o}`);

function fmtStart(iso: string, mins: number): string {
  let when = "";
  try {
    when = new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }) + " ET";
  } catch { /* ignore */ }
  const h = Math.floor(mins / 60), m = mins % 60;
  const rel = mins < 60 ? `${m}m` : h < 24 ? `${h}h ${m}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${when} · in ${rel}`;
}

function evColor(ev: number): string {
  if (ev >= 8) return "#22C55E";
  if (ev >= 4) return "#3B82F6";
  return "#64748B";
}

const CONF_STYLE: Record<string, string> = {
  high: "bg-mm-success/15 text-mm-success border-mm-success/30",
  medium: "bg-mm-accent/15 text-mm-accent border-mm-accent/30",
  low: "bg-mm-panel-2 text-mm-text-faint border-mm-border",
};
const OPPOSITE: Record<string, string> = { Over: "Under", Under: "Over", Yes: "No", No: "Yes" };
const CONF_LABEL: Record<string, string> = { high: "Sharp-confirmed", medium: "2 sharps", low: "1 sharp source" };

// ───────────────────────── log bet ─────────────────────────
function LogForm({ p, onDone }: { p: Pick; onDone: (logged: boolean) => void }) {
  const { session } = useAuth();
  const [amount, setAmount] = useState("");
  const [odds, setOdds] = useState(String(p.odds));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!amount || !odds) return;
    setBusy(true);
    fetch("/api/bets", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        date: easternDateStr(),
        pitcher: `${p.player} (${marketLabel(p.market, p.sport)}) @ ${bookLabel(p.book)}`,
        sport: p.sport.toUpperCase(),
        over_under: p.side,
        odds: Number(odds),
        bet_amount: Number(amount),
        bet_line: p.point,
        result: "Pending",
        actual: null,
        profit: null,
        ev_pct: p.ev_pct,
        no_vig_prob: p.fair_prob,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j && j.success === false) { setErr(j.error || "Could not log the bet"); setBusy(false); return; }
        onDone(true);
      })
      .catch((e) => { setErr(String(e)); setBusy(false); });
  }

  return (
    <div className="mt-3 p-3 rounded-lg border border-mm-border bg-mm-panel-2 text-xs font-mono">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] text-mm-text-faint uppercase tracking-wide">Amount ($)</span>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-24 px-2 py-1 rounded bg-mm-panel border border-mm-border text-mm-text" />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] text-mm-text-faint uppercase tracking-wide">Odds you got</span>
          <input type="number" step="1" value={odds} onChange={(e) => setOdds(e.target.value)}
            className="w-24 px-2 py-1 rounded bg-mm-panel border border-mm-border text-mm-text" />
        </label>
        <button onClick={submit} disabled={busy || !amount || !odds}
          className="px-3 py-1 rounded bg-mm-accent text-mm-bg font-semibold disabled:opacity-50">{busy ? "..." : "Log bet"}</button>
        <button onClick={() => onDone(false)} className="px-2 py-1 text-mm-text-faint">Cancel</button>
      </div>
      <div className="text-[11px] text-mm-text-faint mt-2">
        Quarter-Kelly for this edge is {p.kelly_quarter_pct.toFixed(1)}% of your bankroll.
      </div>
      {err && <div className="text-mm-danger mt-1">{err}</div>}
    </div>
  );
}

// ───────────────────────── card ─────────────────────────
function EvCard({ p }: { p: Pick }) {
  const [open, setOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const isNew = p.first_seen ? Date.now() - new Date(p.first_seen).getTime() < 10 * 60 * 1000 : false;
  const label = `${p.pick} ${marketLabel(p.market, p.sport)}`;

  return (
    <div className="rounded-2xl bg-mm-panel border border-mm-border mb-3 overflow-hidden flex">
      <div className="w-1.5 shrink-0" style={{ background: evColor(p.ev_pct), opacity: p.confidence === "low" ? 0.5 : 1 }} />
      <div className="flex-1 p-4 min-w-0">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold text-mm-text truncate">{p.player}</div>
            <div className="font-mono text-xs text-mm-text-dim">{label}</div>
            <div className="font-mono text-[11px] text-mm-text-faint mt-0.5">
              {SPORT_LABELS[p.sport] || p.sport} · {p.event} · {fmtStart(p.commence, p.minutes_to_start)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-2xl font-bold mm-tabular" style={{ color: evColor(p.ev_pct) }}>+{p.ev_pct.toFixed(1)}%</div>
            <div className="font-mono text-[10px] text-mm-text-faint uppercase tracking-wide">EV</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
          <div>
            <div className="font-mono text-[10px] text-mm-text-faint uppercase tracking-wide">Bet at</div>
            <div className="font-mono text-sm text-mm-text mm-tabular"><span className="font-semibold">{bookLabel(p.book)}</span> {fmtOdds(p.odds)}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-mm-text-faint uppercase tracking-wide">Fair price</div>
            <div className="font-mono text-sm text-mm-text-dim mm-tabular">{fmtOdds(p.fair_odds)} <span className="text-mm-text-faint">({(p.fair_prob * 100).toFixed(1)}%)</span></div>
          </div>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${CONF_STYLE[p.confidence]}`}>{CONF_LABEL[p.confidence]}</span>
          {isNew && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-mm-accent/30 bg-mm-accent/15 text-mm-accent">New</span>}
          <div className="ml-auto flex items-center gap-2">
            {logged ? <span className="text-xs font-mono text-mm-success">✓ Logged</span> : (
              <button onClick={() => setLogging(!logging)}
                className="text-xs font-mono px-2 py-1 rounded-md border border-mm-border text-mm-text-dim hover:border-mm-accent hover:text-mm-accent">📝 Log</button>
            )}
            <button onClick={() => setOpen(!open)} className="text-xs font-mono text-mm-accent hover:underline">{open ? "Less" : "Details"}</button>
          </div>
        </div>

        {logging && !logged && <LogForm p={p} onDone={(ok) => { setLogging(false); if (ok) setLogged(true); }} />}

        {open && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-mm-text-faint uppercase tracking-wide text-[10px] mb-1">Sharp fair price ({p.sharp_spread_pts.toFixed(1)} pt spread)</div>
              {Object.entries(p.sharps).map(([b, v]) => (
                <div key={b} className="flex justify-between border-b border-mm-border/50 py-0.5 text-mm-text-dim">
                  <span>{bookLabel(b)}</span><span className="mm-tabular">{(((p.side === "Under" || p.side === "No") ? 1 - v : v) * 100).toFixed(1)}%</span>
                </div>
              ))}
              <div className="text-[11px] text-mm-text-faint mt-1">
                Each sharp quote has its vig removed, then they are averaged (Pinnacle counts most). {p.single_source && "Only one non-Pinnacle sharp is posting this, so treat it with extra caution."}
              </div>
            </div>
            <div>
              <div className="text-mm-text-faint uppercase tracking-wide text-[10px] mb-1">Every book, best price first</div>
              {p.shop.length === 0 && <div className="text-mm-text-faint">No other book posts this line.</div>}
              {p.shop.length > 0 && (
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center">
                  <div className="text-[10px] text-mm-text-faint uppercase">Book</div>
                  <div className="text-[10px] text-mm-text-faint uppercase text-right">{p.side}</div>
                  <div className="text-[10px] text-mm-text-faint uppercase text-right">{OPPOSITE[p.side] || "Other side"}</div>
                  <div className="text-[10px] text-mm-text-faint uppercase text-right">EV</div>
                  {p.shop.map((s) => {
                    const mine = s.book === p.book;
                    const row = mine ? "text-mm-accent font-semibold" : "text-mm-text-dim";
                    return (
                      <div key={s.book} className="contents">
                        <div className={`border-b border-mm-border/50 py-0.5 ${row}`}>
                          {bookLabel(s.book)}
                          {s.sharp && <span className="ml-1.5 text-[9px] px-1 rounded border border-mm-border text-mm-text-faint">SHARP</span>}
                          {s.ref && <span className="ml-1.5 text-[9px] px-1 rounded border border-mm-border text-mm-text-faint" title="Also helps set the fair price">REF</span>}
                          {mine && <span className="ml-1.5 text-[9px] text-mm-accent">← bet</span>}
                        </div>
                        <div className={`border-b border-mm-border/50 py-0.5 text-right mm-tabular ${row}`}>{fmtOdds(s.odds)}</div>
                        <div className={`border-b border-mm-border/50 py-0.5 text-right mm-tabular ${row}`}>{s.opp != null ? fmtOdds(s.opp) : "–"}</div>
                        <div className={`border-b border-mm-border/50 py-0.5 text-right mm-tabular ${s.ev_pct != null && s.ev_pct >= 0 ? "text-mm-success" : "text-mm-text-faint"}`}>
                          {s.ev_pct != null ? `${s.ev_pct >= 0 ? "+" : ""}${s.ev_pct.toFixed(1)}%` : "–"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-[11px] text-mm-text-faint mt-1">Sharp books and FanDuel (REF) help set the fair price; the fair price for a FanDuel bet leaves FanDuel out. Price last seen {p.age_minutes != null ? `${p.age_minutes} min ago` : "recently"}. Check the live price before you bet.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── page ─────────────────────────
export default function EvBoardPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [showPerf, setShowPerf] = useState(false);

  const [sport, setSport] = useState("all");
  const [market, setMarket] = useState("all");
  const [minEv, setMinEv] = useState(2);
  const [hideLow, setHideLow] = useState(false);
  const [sortBy, setSortBy] = useState<"ev" | "time">("ev");
  const [query, setQuery] = useState("");
  const [myBooks, setMyBooks] = useState<string[] | null>(null);   // null = every book
  const [showBooks, setShowBooks] = useState(false);

  // remembered per browser only; the page works fine when storage is blocked
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_ev_books");
      if (raw) setMyBooks(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  function saveBooks(b: string[] | null) {
    setMyBooks(b);
    try { localStorage.setItem("mm_ev_books", JSON.stringify(b)); } catch { /* ignore */ }
  }

  const load = useCallback(() => {
    if (!session) return;
    fetch("/api/ev-picks?limit=2000", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); setLoading(false); return; }
        setError(null);
        setPicks(j.picks || []);
        setFacets(j.facets || null);
        setLastUpdated(j.last_updated || null);
        setLoading(false);
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [session]);

  useEffect(() => {
    if (!user || !session) return;
    load();
    const t = setInterval(load, 60000);      // the scanner updates every few minutes; one poll a minute is plenty
    return () => clearInterval(t);
  }, [user, session, load]);

  function loadPerf() {
    setShowPerf(!showPerf);
    if (perf || !session) return;
    fetch("/api/ev-performance", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json()).then(setPerf).catch(() => setPerf({ overall: { n: 0 }, error: "Could not load" }));
  }

  const allBooks = useMemo(() => Object.keys(facets?.books || {}).sort((a, b) => bookLabel(a).localeCompare(bookLabel(b))), [facets]);
  const marketOptions = useMemo(() => {
    const seen = new Map<string, { n: number; sport: string }>();
    for (const p of picks) {
      if (sport !== "all" && p.sport !== sport) continue;
      const k = `${p.sport}|${p.market}`;
      seen.set(k, { n: (seen.get(k)?.n || 0) + 1, sport: p.sport });
    }
    return [...seen.entries()].map(([k, v]) => ({ market: k.split("|")[1], sport: v.sport, n: v.n })).sort((a, b) => b.n - a.n);
  }, [picks, sport]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = picks.filter((p) =>
      (sport === "all" || p.sport === sport) &&
      (market === "all" || p.market === market) &&
      p.ev_pct >= minEv &&
      (!hideLow || p.confidence !== "low") &&
      (!myBooks || myBooks.includes(p.book)) &&
      (!q || p.player.toLowerCase().includes(q) || p.event.toLowerCase().includes(q)));
    rows.sort((a, b) => (sortBy === "ev" ? b.ev_pct - a.ev_pct : a.minutes_to_start - b.minutes_to_start));
    return rows;
  }, [picks, sport, market, minEv, hideLow, myBooks, query, sortBy]);

  const age = lastUpdated ? Math.max(0, Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000)) : null;

  if (authLoading) {
    return (<main className="min-h-screen flex items-center justify-center"><div className="text-mm-text-dim font-mono text-sm">Loading...</div></main>);
  }
  if (!user) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <div className="text-center mb-8"><div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Live</div><h1 className="font-display text-3xl font-bold text-mm-text tracking-tight">+EV Board</h1></div>
        <LoginForm />
      </main>
    );
  }

  const chip = (active: boolean) =>
    `font-mono text-[11px] px-2.5 py-1.5 rounded-md border transition ${active ? "bg-mm-accent/15 text-mm-accent border-mm-accent/40 font-semibold" : "border-mm-border text-mm-text-dim hover:text-mm-text hover:bg-mm-panel-2"}`;

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Live</div>
        <h1 className="font-display text-3xl font-bold text-mm-text tracking-tight">+EV Board</h1>
        <div className="font-mono text-[11px] text-mm-text-faint mt-2">
          {picks.length} live bets{age != null && ` · prices checked ${age < 1 ? "just now" : `${age} min ago`}`}
        </div>
      </div>

      <div className="rounded-2xl bg-mm-panel border border-mm-border p-4 mb-5 text-xs text-mm-text-dim leading-relaxed">
        Each bet is a price at a softer sportsbook that beats the <span className="text-mm-text font-semibold">fair price</span> set by the sharpest books
        (Pinnacle, BetOnline, Novig, ProphetX, Polymarket) after their vig is removed. There are no projections here: the sharp market is the benchmark.
        Edges are small and disappear quickly, so check the live price before you bet.
        <button onClick={loadPerf} className="ml-2 text-mm-accent hover:underline">{showPerf ? "Hide track record" : "Does this work? See the track record"}</button>
        {showPerf && (
          <div className="mt-3 rounded-lg bg-mm-panel-2/60 border border-mm-border p-3">
            {!perf && <div className="text-mm-text-faint">Loading...</div>}
            {perf && perf.overall.n === 0 && <div className="text-mm-text-faint">Not enough finished games yet. This fills in as games start.</div>}
            {perf && perf.overall.n > 0 && (
              <div className="font-mono text-xs space-y-1">
                <div className="text-mm-text">{perf.overall.n.toLocaleString()} flagged bets from games that have started</div>
                <div className="text-mm-text-dim mm-tabular">Average edge when flagged: <span className="text-mm-text">{perf.overall.avg_ev_at_flag_pct?.toFixed(1)}%</span></div>
                <div className="text-mm-text-dim mm-tabular">Average edge against the sharp closing price: <span className="text-mm-text">{perf.overall.avg_ev_at_close_pct?.toFixed(1)}%</span> ({perf.overall.pct_positive_at_close?.toFixed(0)}% still positive at close)</div>
                <div className="text-[11px] text-mm-text-faint font-sans leading-snug pt-1">
                  This is closing-line value: if the edge is still positive against the sharp closing price, the flags were real value, not noise. It is a better early test than wins and losses, which take hundreds of bets to mean anything.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* filters */}
      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {["all", "nfl", "nba", "mlb"].map((s) => (
            <button key={s} onClick={() => { setSport(s); setMarket("all"); }} className={chip(sport === s)}>
              {s === "all" ? "All sports" : SPORT_LABELS[s]}{facets ? ` (${s === "all" ? picks.length : picks.filter((p) => p.sport === s).length})` : ""}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={market} onChange={(e) => setMarket(e.target.value)} className="font-mono text-[11px] px-2 py-1.5 rounded-md bg-mm-panel border border-mm-border text-mm-text-dim">
            <option value="all">All markets</option>
            {marketOptions.map((o) => (<option key={`${o.sport}|${o.market}`} value={o.market}>{sport === "all" ? `${SPORT_LABELS[o.sport] || o.sport} ` : ""}{marketLabel(o.market, o.sport)} ({o.n})</option>))}
          </select>
          <select value={minEv} onChange={(e) => setMinEv(Number(e.target.value))} className="font-mono text-[11px] px-2 py-1.5 rounded-md bg-mm-panel border border-mm-border text-mm-text-dim">
            {[2, 3, 4, 5, 8].map((v) => (<option key={v} value={v}>Min EV {v}%</option>))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "ev" | "time")} className="font-mono text-[11px] px-2 py-1.5 rounded-md bg-mm-panel border border-mm-border text-mm-text-dim">
            <option value="ev">Sort: highest EV</option>
            <option value="time">Sort: starting soonest</option>
          </select>
          <button onClick={() => setHideLow(!hideLow)} className={chip(hideLow)}>Hide single-source</button>
          <button onClick={() => setShowBooks(!showBooks)} className={chip(myBooks != null)}>{myBooks ? `My books (${myBooks.length})` : "My books"}</button>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player or team"
            className="font-mono text-[11px] px-2 py-1.5 rounded-md bg-mm-panel border border-mm-border text-mm-text w-44" />
        </div>
        {showBooks && (
          <div className="rounded-lg border border-mm-border bg-mm-panel p-3">
            <div className="text-[11px] text-mm-text-faint mb-2">Only show bets at the books you have accounts with. Saved in this browser.</div>
            <div className="flex flex-wrap gap-2">
              {allBooks.map((b) => {
                const on = !myBooks || myBooks.includes(b);
                return (
                  <button key={b} className={chip(on)} onClick={() => {
                    const cur = myBooks || allBooks;
                    const next = cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b];
                    saveBooks(next.length === allBooks.length ? null : next);
                  }}>{bookLabel(b)}</button>
                );
              })}
              {myBooks && <button className="font-mono text-[11px] text-mm-accent px-2" onClick={() => saveBooks(null)}>Show all books</button>}
            </div>
          </div>
        )}
      </div>

      {loading && <div className="text-center text-mm-text-dim font-mono text-sm">Loading...</div>}
      {error === "subscription_required" && (
        <div className="text-center rounded-2xl bg-mm-panel border border-mm-border p-6 text-sm text-mm-text-dim">
          Your trial has ended. Subscribe from <a href="/settings" className="text-mm-accent underline">Settings</a> to see live +EV bets.
        </div>
      )}
      {error && error !== "subscription_required" && <div className="text-center text-mm-danger font-mono text-sm mb-6">{error}</div>}
      {!loading && !error && shown.length === 0 && (
        <div className="text-center rounded-2xl bg-mm-panel border border-mm-border p-8 text-sm text-mm-text-dim">
          {picks.length === 0
            ? "No +EV bets right now. Real edges are rare and short-lived, and this refreshes on its own as games get closer."
            : "No bets match these filters. Try lowering the minimum EV or showing all books."}
        </div>
      )}
      {shown.map((p) => <EvCard key={p.id} p={p} />)}
    </main>
  );
}
