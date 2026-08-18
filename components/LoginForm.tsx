"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function LoginForm() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);

    if (result.error) {
      // Real, direct match to the same real "email not confirmed"
      // case the Streamlit app already handles specially.
      if (result.error.toLowerCase().includes("email not confirmed")) {
        setInfo("Check your inbox — you need to confirm your email before logging in.");
      } else {
        setError(result.error);
      }
    } else if (mode === "signup") {
      setInfo("Account created! Check your email to confirm before logging in.");
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-sm mx-auto mt-8 relative rounded-lg border border-mm-border bg-mm-panel overflow-hidden">
      <div className="h-[3px] bg-mm-accent" />
      <div className="p-6">
      <div className="flex gap-4 mb-6 border-b border-mm-border">
        <button
          onClick={() => { setMode("login"); setError(null); setInfo(null); }}
          className={`pb-2 font-display font-semibold text-sm ${mode === "login" ? "text-mm-accent border-b-2 border-mm-accent" : "text-mm-text-dim"}`}
        >
          Login
        </button>
        <button
          onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
          className={`pb-2 font-display font-semibold text-sm ${mode === "signup" ? "text-mm-accent border-b-2 border-mm-accent" : "text-mm-text-dim"}`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] text-mm-text-faint mb-1 font-mono uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text focus:outline-none focus:border-mm-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] text-mm-text-faint mb-1 font-mono uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-mm-panel-2 border border-mm-border text-mm-text focus:outline-none focus:border-mm-accent transition-colors"
          />
        </div>

        {error && <div className="text-mm-danger text-sm font-mono">{error}</div>}
        {info && <div className="text-mm-success text-sm font-mono">{info}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 py-2 rounded-lg bg-mm-accent text-mm-bg font-display font-semibold disabled:opacity-50 hover:brightness-110 transition"
        >
          {submitting ? "..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
      </div>
    </div>
  );
}
