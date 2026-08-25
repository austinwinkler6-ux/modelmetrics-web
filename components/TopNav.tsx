"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { SPORT_KEYS } from "@/lib/sportConstants";

const NAV_LABELS: Record<string, string> = {
  mlb: "MLB Strikeouts",
  "nba-points": "NBA Points",
  "nba-assists": "NBA Assists",
  "nfl-attempts": "NFL Attempts",
  "nfl-completions": "NFL Completions",
  "nfl-receptions": "NFL Receptions",
  "nfl-td": "NFL TD",
  lol: "LoL",
};

export default function TopNav() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  function linkClass(href: string) {
    const active = pathname === href;
    return `font-mono text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-md transition-all ${
      active
        ? "bg-mm-accent/15 text-mm-accent font-semibold"
        : "text-mm-text-dim hover:text-mm-text hover:bg-mm-panel-2"
    }`;
  }

  return (
    <nav className="sticky top-0 z-10 backdrop-blur-md bg-mm-bg/95 border-b border-mm-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt="Model Metrics" width={32} height={32} className="rounded" />
            <span className="font-display font-bold text-mm-text text-sm tracking-wide hidden sm:inline">
              Model Metrics
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-mm-text-faint font-mono text-[11px] hidden md:inline">{user.email}</span>
            <button onClick={() => signOut()} className="font-mono text-[11px] text-mm-text-dim hover:text-mm-text px-2 py-1 rounded hover:bg-mm-panel-2 transition">
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-mm-border bg-mm-panel/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {SPORT_KEYS.map((sport) => (
            <Link key={sport} href={`/${sport}`} className={linkClass(`/${sport}`)}>
              {NAV_LABELS[sport] || sport}
            </Link>
          ))}
          <div className="w-px h-4 bg-mm-border mx-1" />
          <Link href="/top-picks" className={linkClass("/top-picks")}>Top Picks</Link>
          <Link href="/bets" className={linkClass("/bets")}>Bet Tracker</Link>
          <Link href="/settings" className={linkClass("/settings")}>Settings</Link>
        </div>
      </div>
    </nav>
  );
}
