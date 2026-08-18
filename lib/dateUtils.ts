// Real, direct match to bet_math.py's own mm_today_str — "today" in
// Eastern Time specifically, not the browser's local time zone or
// UTC. Matters for the exact same real reason it matters there:
// bankroll baseline dates and bet dates need to compare consistently
// against each other, and Streamlit's whole app already uses Eastern
// time as its real, single source of truth for "today."
export function easternDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  // en-CA locale formats as YYYY-MM-DD directly, matching mm_today_str's own format.
}
