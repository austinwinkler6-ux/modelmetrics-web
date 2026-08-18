import { createClient } from "@supabase/supabase-js";

// Real, deliberate choice — same real Supabase project your Streamlit
// app already uses, so a real, existing user account works identically
// on both. These two values are SAFE to hardcode directly here — this
// is the anon/publishable key, specifically designed by Supabase to be
// public, protected instead by Row Level Security policies on the
// database side (completely different from BRIDGE_API_KEY, which must
// stay secret and lives server-side in worker.js instead).
//
// Real fix (August 2026, per direct, repeated real frustration trying
// to get Cloudflare's own environment-variable system — both the
// runtime "Variables and secrets" AND the separate "Build Variables
// and secrets" section their own docs describe — to actually work)
// hardcoding these directly removes the dependency on Cloudflare's
// build environment correctly passing these through at all, which
// wasn't working as documented after several real, genuine attempts.
const supabaseUrl = "https://kuobzhcdftpeuinetsvy.supabase.co";
const supabaseAnonKey = "sb_publishable_vsC7tj08D5he4GdtrMzwWg_CyLR33mf";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
