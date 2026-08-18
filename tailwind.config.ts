import type { Config } from "tailwindcss";

// Real, deliberate redesign (round 2, August 2026, per direct user
// reference screenshots — "can we move to something like these").
// Blue accent replaces amber, matching the reference's cleaner,
// bluer SaaS-dashboard direction, plus real chart support added to
// the Bet Tracker (see recharts in package.json).
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "mm-bg": "#0A0E1A",
        "mm-panel": "#111827",
        "mm-panel-2": "#161C2C",
        "mm-border": "#232B3D",
        "mm-border-bright": "#334155",
        "mm-accent": "#3B82F6",
        "mm-accent-dim": "#1E40AF",
        "mm-success": "#22C55E",
        "mm-danger": "#EF4444",
        "mm-text": "#F1F5F9",
        "mm-text-dim": "#94A3B8",
        "mm-text-faint": "#64748B",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
