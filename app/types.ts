// Real, direct match to api_server.py's own real response shapes —
// keep these in sync if fields ever change there.

export interface PlayerPropPick {
  player: string;
  sport: string;
  line: number | null;
  recommended_pick: string | null;
  over_under: "Over" | "Under" | null;
  projection: number | null;
  model_probability: number | null;
  no_vig_probability: number | null;
  market_odds: number | null;
  edge: number | null;
  ev_pct: number | null;
  mm_tier: string | null;
  confidence_level: string | null;
  matchup: string | null;
  start_time?: string | null;
  why_lines: string[];
  _raw_info: Record<string, unknown>;
  _raw_result: Record<string, unknown>;
}

// Real shape returned by /api/mm-stake — mirrors calculate_mm_stake()'s
// own real two possible return shapes in bet_math.py (a real "pass"
// case, or a real stake recommendation).
export interface MmStakeResult {
  pass?: boolean;
  reason?: string;
  stake_units?: number;
  stake_dollars?: number;
  reasoning?: string[];
}

export interface LolPick {
  home_team: string;
  away_team: string;
  sport: "LoL";
  predicted_winner: string;
  recommended_pick: string;
  confidence: number | null;
  model_probability: number | null;
  market_odds: number | null;
  implied_probability: number | null;
  edge_pct: number | null;
  ev_pct: number | null;
  mm_tier: string | null;
  start_time: string | null;
  team1_rating: number | null;
  team2_rating: number | null;
  why_lines?: string[];
  _raw_info?: Record<string, unknown>;
  _raw_result?: Record<string, unknown>;
}

export interface Bet {
  id: string;
  date: string;
  pitcher: string;  // real field name kept as "pitcher" to match the real, existing bets table schema — used as the general "player/matchup" field across every sport, not literally MLB-only
  sport: string;
  over_under: string | null;
  odds: number | null;
  bet_amount: number | null;
  result: string;
  actual: number | null;
  profit: number | null;
  ev_pct?: number | null;
  mm_tier?: string | null;
  mm_stake_recommended?: number | null;
  closing_line?: number | null;
  closing_odds?: number | null;
  odds_clv?: number | null;
  created_at?: string;
}

export interface BankrollTransaction {
  id: string;
  amount: number;
  transaction_date: string;
  created_at?: string;
}

export interface UserSettings {
  starting_bankroll: number | null;
  risk_style: string | null;
  bankroll_set_date?: string | null;
}

export interface SubscriptionStatus {
  status: "active" | "trialing" | "expired";
  days_left_in_trial: number | null;
  unlimited: boolean;
  error?: string;
}

export interface AllPicksResponse {
  sports: {
    mlb: PlayerPropPick[];
    "nba-points": PlayerPropPick[];
    "nba-assists": PlayerPropPick[];
    "nfl-attempts": PlayerPropPick[];
    "nfl-completions": PlayerPropPick[];
    "nfl-receptions": PlayerPropPick[];
    lol: LolPick[];
  };
  errors?: Record<string, string>;
  total_count: number;
  time: string;
}

// Real shape returned by /api/play-of-the-day — always a real
// player-prop pick now; LoL is deliberately excluded (esports stays
// its own real, exclusive thing, not given away as a free teaser).
export interface PlayOfTheDayResponse {
  pick: (PlayerPropPick & { _kind: "prop" }) | null;
}

// Real shape returned by /api/model-performance — Phase 1: MLB + NBA
// only, matching what's actually being graded server-side right now.
export interface ModelPerformanceResponse {
  wins: number;
  losses: number;
  total_graded: number;
  win_rate: number | null;
  roi_pct: number | null;
  by_sport: Record<string, { wins: number; losses: number }>;
  error?: string;
}
