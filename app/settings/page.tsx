"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import LoginForm from "@/components/LoginForm";
import type { UserSettings, SubscriptionStatus, Bet, BankrollTransaction } from "../types";

const RISK_STYLES = ["Conservative", "Standard", "Aggressive"];

export default function SettingsPage() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Bankroll form state
  const [newBankroll, setNewBankroll] = useState("");
  const [riskStyle, setRiskStyle] = useState("Standard");
  const [savingBankroll, setSavingBankroll] = useState(false);

  // Adjustment form state
  const [adjustment, setAdjustment] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [transactions, setTransactions] = useState<BankrollTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  function authHeader() {
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  function loadAll() {
    if (!session) return;
    setLoading(true);
    Promise.all([
      fetch("/api/user-settings", { headers: authHeader() }).then((r) => r.json()),
      fetch("/api/bets", { headers: authHeader() }).then((r) => r.json()),
      fetch("/api/subscription", { headers: authHeader() }).then((r) => r.json()),
    ])
      .then(([settingsJson, betsJson, subJson]) => {
        setSettings(settingsJson);
        setBets(betsJson.bets || []);
        setSub(subJson);
        setRiskStyle(settingsJson.risk_style || "Standard");
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }

  function loadTransactions() {
    if (!session) return;
    fetch("/api/bankroll-transactions", { headers: authHeader() })
      .then((res) => res.json())
      .then((json) => setTransactions(json.transactions || []))
      .catch(() => {});
  }

  useEffect(() => {
    if (!user || !session) return;
    loadAll();
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  // Real, direct client-side port of mlb_app.py's get_current_bankroll
  // — starting bankroll + sum of profit from bets settled on or after
  // the real baseline date. Never a stored/synced number, so it can't
  // drift out of sync with the real bet history.
  const currentBankroll = (() => {
    if (!settings || settings.starting_bankroll == null) return null;
    const baseline = settings.bankroll_set_date || "1900-01-01";
    const profitSince = bets
      .filter((b) => b.result !== "Pending" && b.date && b.date >= baseline)
      .reduce((sum, b) => sum + (b.profit || 0), 0);
    return Math.round((settings.starting_bankroll + profitSince) * 100) / 100;
  })();

  // Real, new grouping — transactions bucketed by real calendar month,
  // most recent first, each showing a real net total for that month.
  const transactionsByMonth = (() => {
    const groups: Record<string, { total: number; count: number }> = {};
    for (const t of transactions) {
      const month = (t.transaction_date || "").slice(0, 7); // "YYYY-MM"
      if (!month) continue;
      if (!groups[month]) groups[month] = { total: 0, count: 0 };
      groups[month].total += t.amount;
      groups[month].count += 1;
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({ month, ...data }));
  })();

  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function saveBankroll(e: React.FormEvent) {
    e.preventDefault();
    setSavingBankroll(true);
    setError(null);
    setInfo(null);
    if (newBankroll) {
      fetch("/api/user-settings", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ starting_bankroll: Number(newBankroll), risk_style: riskStyle, reset_baseline: true }),
      })
        .then((res) => res.json())
        .then(() => {
          setInfo("✅ Bankroll settings saved.");
          setNewBankroll("");
          setSavingBankroll(false);
          loadAll();
        })
        .catch((e) => {
          setError(String(e));
          setSavingBankroll(false);
        });
    } else if (settings?.starting_bankroll != null) {
      fetch("/api/user-settings", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ starting_bankroll: settings.starting_bankroll, risk_style: riskStyle, reset_baseline: false }),
      })
        .then((res) => res.json())
        .then(() => {
          setInfo("✅ Risk style updated.");
          setSavingBankroll(false);
          loadAll();
        })
        .catch((e) => {
          setError(String(e));
          setSavingBankroll(false);
        });
    } else {
      setError("Enter a starting bankroll to get started.");
      setSavingBankroll(false);
    }
  }

  function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustment || !settings?.starting_bankroll) return;
    setSavingAdjustment(true);
    setError(null);
    setInfo(null);
    const amt = Number(adjustment);
    const newStarting = Math.round((settings.starting_bankroll + amt) * 100) / 100;
    fetch("/api/user-settings", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ starting_bankroll: newStarting, risk_style: settings.risk_style || "Standard", reset_baseline: false }),
    })
      .then((res) => res.json())
      // Real, new addition — logs this real adjustment as its own
      // real transaction record, so it shows up in the real
      // Transaction History below, not just as a real, silent change
      // to the underlying starting_bankroll number.
      .then(() =>
        fetch("/api/bankroll-transactions", {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt }),
        })
      )
      .then(() => {
        setInfo(`✅ Bankroll adjusted by ${amt >= 0 ? "+" : ""}$${amt.toFixed(2)}.`);
        setAdjustment("");
        setSavingAdjustment(false);
        loadAll();
        loadTransactions();
      })
      .catch((e) => {
        setError(String(e));
        setSavingAdjustment(false);
      });
  }

  function openBillingPortal() {
    setPortalLoading(true);
    fetch("/api/billing-portal", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ site_url: window.location.origin }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.portal_url) window.location.href = json.portal_url;
        else if (json.error && json.error.includes("No real Stripe customer")) {
          // Real, expected case — a real, full-access account (like
          // the real admin bypass) with no real Stripe subscription
          // to manage at all, not a genuine error.
          setInfo("You have full access with no billing to manage.");
          setPortalLoading(false);
        } else {
          setError(json.error || "Real error opening billing portal.");
          setPortalLoading(false);
        }
      })
      .catch((e) => {
        setError(String(e));
        setPortalLoading(false);
      });
  }

  function startCheckout() {
    setCheckoutLoading(true);
    fetch("/api/checkout", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ site_url: window.location.origin }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.checkout_url) window.location.href = json.checkout_url;
        else {
          setError(json.error || "Real error starting checkout.");
          setCheckoutLoading(false);
        }
      })
      .catch((e) => {
        setError(String(e));
        setCheckoutLoading(false);
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
        <div className="text-center mb-8"><div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Account</div><h1 className="font-display text-3xl font-bold text-mm-text tracking-tight">Settings</h1></div>
        <LoginForm />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="text-center mb-8"><div className="text-mm-accent font-mono text-[11px] tracking-[0.2em] uppercase mb-2">Account</div><h1 className="font-display text-3xl font-bold text-mm-text tracking-tight">Settings</h1></div>

      {error && <div className="text-center text-mm-danger font-mono text-sm mb-4">{error}</div>}
      {info && <div className="text-center text-mm-success font-mono text-sm mb-4">{info}</div>}

      {loading ? (
        <div className="text-center text-mm-text-dim font-mono text-sm">Loading...</div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold text-mm-text mb-3">Account Information</h2>
            <div className="p-4 rounded-xl border border-mm-border bg-mm-panel text-sm font-mono text-mm-text-dim">
              Email: {user.email}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold text-mm-text mb-1">💰 Build Your Bankroll Profile</h2>
            <p className="text-xs text-mm-text-faint font-mono mb-3">
              Powers MM Stake — a Quarter-Kelly stake recommendation on every pick, sized to your actual bankroll.
            </p>

            {currentBankroll != null ? (
              <div className="p-4 rounded-xl border border-mm-border bg-mm-panel mb-4">
                <div className="text-xs text-mm-text-faint font-mono mb-1">Current Bankroll</div>
                <div className="text-2xl font-display font-bold text-mm-accent">${currentBankroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-mm-text-faint font-mono mt-1">
                  Baseline of ${settings?.starting_bankroll?.toLocaleString(undefined, { minimumFractionDigits: 2 })} set on {settings?.bankroll_set_date}, adjusted live by your settled bet profit since then.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-mm-border bg-mm-panel mb-4 text-sm text-mm-text-dim font-mono">
                No bankroll set yet — set one below to enable MM Stake recommendations.
              </div>
            )}

            <form onSubmit={saveBankroll} className="p-4 rounded-xl border border-mm-border bg-mm-panel flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mm-text-faint font-mono mb-1">Set / Reset Bankroll ($)</label>
                  <input
                    type="number" step="0.01" placeholder="e.g. 2500.00" value={newBankroll}
                    onChange={(e) => setNewBankroll(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-mm-text-faint font-mono mb-1">Risk Style</label>
                  <select value={riskStyle} onChange={(e) => setRiskStyle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text">
                    {RISK_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-mm-text-faint font-mono">
                Caps the maximum single-bet stake: Conservative 1% of bankroll, Standard 2%, Aggressive 3%.
              </p>
              <button type="submit" disabled={savingBankroll} className="py-2 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold disabled:opacity-50">
                {savingBankroll ? "..." : "💾 Save Bankroll Settings"}
              </button>
            </form>

            {settings?.starting_bankroll != null && (
              <form onSubmit={applyAdjustment} className="mt-4 p-4 rounded-xl border border-mm-border bg-mm-panel flex flex-col gap-3">
                <p className="text-xs text-mm-text-faint font-mono">
                  Deposited more money, or pulled some out? Adjust your bankroll without resetting your tracking history or start date.
                </p>
                <div className="flex gap-3">
                  <input
                    type="number" step="0.01" placeholder="e.g. 500 to add, -200 to remove" value={adjustment}
                    onChange={(e) => setAdjustment(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text"
                  />
                  <button type="submit" disabled={savingAdjustment} className="px-4 py-2 rounded-lg border border-mm-border text-mm-text-dim font-mono text-sm hover:border-mm-accent hover:text-mm-accent disabled:opacity-50">
                    {savingAdjustment ? "..." : "➕ Apply"}
                  </button>
                </div>
              </form>
            )}

            {transactions.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs font-mono text-mm-text-dim hover:text-mm-accent"
                >
                  {showHistory ? "▼" : "▶"} Transaction History ({transactions.length})
                </button>

                {showHistory && (
                  <div className="mt-3 p-4 rounded-xl border border-mm-border bg-mm-panel">
                    <h4 className="text-xs font-display font-semibold text-mm-text-dim mb-2">By Month</h4>
                    <table className="w-full text-xs font-mono mb-4">
                      <tbody>
                        {transactionsByMonth.map((m) => (
                          <tr key={m.month} className="border-b border-mm-border/50">
                            <td className="py-1 text-mm-text-dim">{formatMonth(m.month)}</td>
                            <td className="py-1 text-mm-text-faint text-right">{m.count} transaction{m.count === 1 ? "" : "s"}</td>
                            <td className={`py-1 text-right font-semibold ${m.total >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
                              {m.total >= 0 ? "+" : ""}${m.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <h4 className="text-xs font-display font-semibold text-mm-text-dim mb-2">All Transactions</h4>
                    <table className="w-full text-xs font-mono">
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id} className="border-b border-mm-border/50">
                            <td className="py-1 text-mm-text-faint">{t.transaction_date}</td>
                            <td className={`py-1 text-right font-semibold ${t.amount >= 0 ? "text-mm-success" : "text-mm-danger"}`}>
                              {t.amount >= 0 ? "+" : ""}${t.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="mb-10">
            <h2 className="font-display text-lg font-semibold text-mm-text mb-3">Subscription</h2>
            <div className="p-4 rounded-xl border border-mm-border bg-mm-panel">
              {sub?.status === "active" ? (
                <>
                  <div className="text-mm-success font-mono text-sm mb-3">✅ You&apos;re subscribed — full access to every model.</div>
                  <button
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    className="w-full py-2 rounded-lg border border-mm-border text-mm-text-dim font-mono text-sm hover:border-mm-accent hover:text-mm-accent disabled:opacity-50"
                  >
                    {portalLoading ? "..." : "Manage Subscription"}
                  </button>
                </>
              ) : sub?.status === "trialing" ? (
                <>
                  <div className="text-mm-accent font-mono text-sm mb-3">
                    🎉 {sub.days_left_in_trial} day{sub.days_left_in_trial === 1 ? "" : "s"} left in your free trial.
                  </div>
                  <button
                    onClick={startCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-2 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold disabled:opacity-50"
                  >
                    {checkoutLoading ? "..." : "🔓 Subscribe Now"}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-mm-danger font-mono text-sm mb-3">🔒 Your free trial has ended.</div>
                  <button
                    onClick={startCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-2 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold disabled:opacity-50"
                  >
                    {checkoutLoading ? "..." : "🔓 Subscribe Now"}
                  </button>
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-mm-text mb-3">Danger Zone</h2>
            <button
              onClick={() => signOut()}
              className="w-full py-2 rounded-lg border border-mm-danger/40 text-mm-danger font-mono text-sm hover:bg-mm-danger/10"
            >
              🚪 Logout
            </button>
          </section>
        </>
      )}
    </main>
  );
}
