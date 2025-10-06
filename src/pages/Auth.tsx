// src/pages/Auth.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // SPA hash-based callback that renders <AuthCallback /> and runs PKCE exchange
  const HASH_CALLBACK =
    "https://memento-eight-amber.vercel.app/#/auth/callback";

  const handleSignIn = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else window.location.hash = "/dashboard";
  };

  const handleSignUp = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // Magic-link redirect should also land on the SPA callback route
      options: { emailRedirectTo: HASH_CALLBACK },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Check your inbox to confirm your email, then sign in.");
  };

  const handleForgot = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    // After reset, send them back to the SPA to complete auth flow
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: HASH_CALLBACK,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Password reset link sent. Check your email.");
  };

  // OAuth: full-page redirect to SPA callback
  const oauth = async (provider: "google" | "apple") => {
    setBusy(true);
    setErr(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: HASH_CALLBACK,
        // Helps Google show the account chooser reliably
        queryParams: { prompt: "select_account", access_type: "offline" },
      },
    });

    // On success, the browser will navigate away; no need to unset busy.
    if (error) {
      setBusy(false);
      setErr(error.message);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ margin: 0 }}>
          Sign{" "}
          {mode === "signup" ? "up" : mode === "signin" ? "in" : "in to reset"}
        </h1>

        <div style={{ height: 10 }} />

        {err && <div style={errorBox}>{err}</div>}
        {msg && <div style={infoBox}>{msg}</div>}

        <label style={label}>Email</label>
        <input
          style={input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />

        {mode !== "forgot" && (
          <>
            <label style={label}>Password</label>
            <input
              style={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              placeholder="••••••••"
            />
          </>
        )}

        <div style={{ height: 12 }} />

        {mode === "signin" && (
          <button style={primaryBtn} disabled={busy} onClick={handleSignIn}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        )}
        {mode === "signup" && (
          <button style={primaryBtn} disabled={busy} onClick={handleSignUp}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        )}
        {mode === "forgot" && (
          <button style={primaryBtn} disabled={busy} onClick={handleForgot}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        )}

        <div style={{ height: 12 }} />

        <div style={row}>
          {mode !== "signin" && (
            <button style={linkBtn} onClick={() => setMode("signin")}>
              Have an account? Sign in
            </button>
          )}
          {mode !== "signup" && (
            <button style={linkBtn} onClick={() => setMode("signup")}>
              New here? Sign up
            </button>
          )}
          {mode !== "forgot" && (
            <button style={linkBtn} onClick={() => setMode("forgot")}>
              Forgot password
            </button>
          )}
        </div>

        <div style={{ height: 14 }} />
        <div style={{ textAlign: "center", opacity: 0.6, fontSize: 12 }}>
          or
        </div>
        <div style={{ height: 10 }} />

        <div style={row}>
          <button
            style={oauthBtn}
            disabled={busy}
            onClick={() => oauth("google")}
          >
            Continue with Google
          </button>
          <button
            style={oauthBtn}
            disabled={busy}
            onClick={() => oauth("apple")}
          >
            Continue with Apple
          </button>
        </div>
      </div>
    </div>
  );
}

/* styles unchanged */
const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background:
    "radial-gradient(120% 120% at 30% 20%, rgba(0,0,0,0.04), rgba(0,0,0,0.02))",
};
const card: React.CSSProperties = {
  width: "min(440px, 92vw)",
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(16px) saturate(140%)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 16,
  boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
  padding: 20,
};
const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  marginBottom: 12,
  fontSize: 14,
};
const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: 0,
  fontWeight: 700,
  cursor: "pointer",
  background: "#6d28d9",
  color: "white",
  boxShadow: "0 10px 24px rgba(109,40,217,0.25)",
};
const oauthBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "#6d28d9",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};
const row: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "center",
};
const errorBox: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "8px 10px",
  borderRadius: 8,
  marginBottom: 10,
};
const infoBox: React.CSSProperties = {
  background: "#ecfeff",
  color: "#155e75",
  padding: "8px 10px",
  borderRadius: 8,
  marginBottom: 10,
};
