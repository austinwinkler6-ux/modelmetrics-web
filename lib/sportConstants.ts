export const SPORT_LABELS: Record<string, string> = {
  mlb: "⚾ MLB",
  "nfl-td": "🏈 NFL Touchdowns",
  // NBA Points and NBA Assists REMOVED (Sep 2026) — both backtested
  // twice against real historical odds with consistent, repeated
  // negative results (NBA Points: 18,218 bets then 9,785 bets after
  // a pace-calculation fix, every EV bucket negative both times; NBA
  // Assists: 17,004 bets, every EV bucket negative). Same treatment
  // as LoL before it — pulled from the live nav/site, not deleted
  // from the codebase.
  // LoL REMOVED (Aug 2026) — backtested against real historical
  // Polymarket prices (844 graded bets across an expanded date range,
  // walk-forward, leak-free): no profitable EV/tier/favorite-
  // underdog filter survived scrutiny at scale. See lol_backtest.py.
};

// Real, direct match to the exact real sport codes the bets table
// itself uses (matches mlb_app.py's own MODEL_KEY_TO_SAVE_LABEL) —
// different from the sportKey values above, which are just this
// site's own real display/API keys.
export const SPORT_BET_CODES: Record<string, string> = {
  mlb: "MLB",
  "nfl-td": "NFL_TD",
  // nba-points/nba-assists/lol kept out in step with SPORT_LABELS
  // above. Historical bets logged under "NBA"/"NBA_AST"/"LOL" in the
  // bets table still exist and are unaffected by this removal.
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
