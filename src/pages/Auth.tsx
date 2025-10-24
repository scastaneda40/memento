// src/pages/Auth.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { IS_SPATIAL } from "../env";

type Mode = "signin" | "signup" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const REDIRECT_TO = new URL(
    "auth/callback.html",
    window.location.origin + import.meta.env.BASE_URL
  ).toString();

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
      options: { emailRedirectTo: REDIRECT_TO },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Check your inbox to confirm your email, then sign in.");
  };

  const handleForgot = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: REDIRECT_TO,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Password reset link sent. Check your email.");
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
      </div>
    </div>
  );
}

/* styles */
const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: IS_SPATIAL
    ? "transparent"
    : "radial-gradient(120% 120% at 30% 20%, rgba(0,0,0,0.04), rgba(0,0,0,0.02))",
};

const card: React.CSSProperties = {
  width: "min(440px, 92vw)",
  background: IS_SPATIAL ? "transparent" : "rgba(255,255,255,0.9)",
  backdropFilter: IS_SPATIAL ? undefined : "blur(16px) saturate(140%)",
  border: IS_SPATIAL
    ? "1px solid rgba(255,255,255,0.25)"
    : "1px solid rgba(0,0,0,0.08)",
  borderRadius: 16,
  boxShadow: IS_SPATIAL
    ? "0 0 24px rgba(255,255,255,0.15)"
    : "0 12px 36px rgba(0,0,0,0.16)",
  padding: 24,
  color: IS_SPATIAL ? "rgba(255,255,255,0.92)" : "#111827", // ✅ brighter text for transparent bg
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: IS_SPATIAL ? "rgba(255,255,255,0.85)" : "#111827",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: IS_SPATIAL
    ? "1px solid rgba(255,255,255,0.4)"
    : "1px solid rgba(0,0,0,0.12)",
  background: IS_SPATIAL ? "rgba(255,255,255,0.08)" : "white",
  color: IS_SPATIAL ? "rgba(255,255,255,0.95)" : "#111827",
  marginBottom: 12,
  fontSize: 14,
  outline: "none",
  boxShadow: IS_SPATIAL
    ? "inset 0 0 8px rgba(255,255,255,0.08)"
    : "inset 0 1px 2px rgba(0,0,0,0.08)",
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
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
};

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: IS_SPATIAL ? "rgba(255,255,255,0.85)" : "#6d28d9",
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
  background: IS_SPATIAL ? "rgba(255,0,0,0.1)" : "#fee2e2",
  color: IS_SPATIAL ? "#ffaaaa" : "#991b1b",
  padding: "8px 10px",
  borderRadius: 8,
  marginBottom: 10,
};

const infoBox: React.CSSProperties = {
  background: IS_SPATIAL ? "rgba(0,255,255,0.08)" : "#ecfeff",
  color: IS_SPATIAL ? "#b3ffff" : "#155e75",
  padding: "8px 10px",
  borderRadius: 8,
  marginBottom: 10,
};
