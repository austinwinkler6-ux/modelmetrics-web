export const SPORT_LABELS: Record<string, string> = {
  mlb: "⚾ MLB",
  "nba-points": "🏀 NBA Points",
  "nba-assists": "🏀 NBA Assists",
  "nfl-td": "🏈 NFL Touchdowns",
  // LoL REMOVED (Aug 2026) — backtested against real historical
  // Polymarket prices (649 graded bets, walk-forward, leak-free):
  // -27.44% ROI overall, no profitable EV/tier/favorite-underdog
  // filter survived a larger sample. Same treatment as NFL pass
  // attempts/completions/receptions before it — pulled from the
  // live nav/site, not deleted from the codebase.
};

export const SPORT_BET_CODES: Record<string, string> = {
  mlb: "MLB",
  "nba-points": "NBA",
  "nba-assists": "NBA_AST",
  "nfl-td": "NFL_TD",
};

export const SPORT_KEYS = Object.keys(SPORT_LABELS);

export const TIER_KEYS = ["🟢 Best Bet", "🔵 Worth a Look", "🟡 Lean", "🔴 Pass"];

export const TIER_SIGNAL_COLORS: Record<string, string> = {
  "🟢 Best Bet": "#22C55E",
  "🔵 Worth a Look": "#3B82F6",
  "🟡 Lean": "#F59E0B",
  "🔴 Pass": "#64748B",
};
