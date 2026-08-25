export const SPORT_LABELS: Record<string, string> = {
  mlb: "⚾ MLB",
  "nba-points": "🏀 NBA Points",
  "nba-assists": "🏀 NBA Assists",
  "nfl-attempts": "🏈 NFL Pass Attempts",
  "nfl-completions": "🏈 NFL Pass Completions",
  "nfl-receptions": "🏈 NFL Receptions",
  "nfl-td": "🏈 NFL Touchdowns",
  lol: "🎮 Esports (LoL)",
};

// Real, direct match to the exact real sport codes the bets table
// itself uses (matches mlb_app.py's own MODEL_KEY_TO_SAVE_LABEL) —
// different from the sportKey values above, which are just this
// site's own real display/API keys.
export const SPORT_BET_CODES: Record<string, string> = {
  mlb: "MLB",
  "nba-points": "NBA",
  "nba-assists": "NBA_AST",
  "nfl-attempts": "NFL",
  "nfl-completions": "NFL_COMPLETIONS",
  "nfl-receptions": "NFL_RECEPTIONS",
  "nfl-td": "NFL_TD",
  lol: "LOL",
};

export const SPORT_KEYS = Object.keys(SPORT_LABELS);

export const TIER_KEYS = ["🟢 Best Bet", "🔵 Worth a Look", "🟡 Lean", "🔴 Pass"];

// Real, solid signal colors — used for the redesigned pick card's
// left-edge indicator bar and the large EV% figure, styled after a
// real trading terminal's buy/hold/sell color coding.
export const TIER_SIGNAL_COLORS: Record<string, string> = {
  "🟢 Best Bet": "#22C55E",
  "🔵 Worth a Look": "#3B82F6",
  "🟡 Lean": "#F59E0B",
  "🔴 Pass": "#64748B",
};
