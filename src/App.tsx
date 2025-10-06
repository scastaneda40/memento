// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WallView from "./pages/WallView";
import AuthView from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Wall } from "./types";

type Route = "landing" | "dashboard" | "wall" | "auth" | "authcb";

// Hash router for app views
const getRoute = (): Route => {
  const h = window.location.hash;
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
  if (h.startsWith("#/auth/callback")) return "authcb"; // <-- SPA callback route
  if (h.startsWith("#/auth")) return "auth";
  return "landing";
};

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null); // null = booting
  const [processingOauth, setProcessingOauth] = useState(false);

  // --- 1) If we returned from the provider (?code=...), exchange FIRST.
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    setProcessingOauth(true);
    console.log("[oauth] code detected → exchanging…");

    (async () => {
      const { error, data } = await supabase.auth.exchangeCodeForSession(
        url.toString()
      );
      if (error) {
        console.error("[oauth] exchange failed:", error.message);
        // keep query so user can retry or we can inspect; but go to /auth UI
        window.location.hash = "/auth";
      } else {
        console.log("[oauth] exchange OK → user:", data.session?.user?.id);
        // strip ?code then continue
        url.search = "";
        window.history.replaceState({}, "", url.toString());
        window.location.hash = "/dashboard";
      }
      setProcessingOauth(false);
    })();
  }, []);

  // Freeze UI while we’re doing the PKCE exchange to avoid any redirects/routing.
  if (processingOauth) return null;

  // --- 2) Basic hash router
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // --- 3) Boot once, then react to auth changes
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthed(!!data.session);
      if (data.session && getRoute() === "landing") {
        window.location.hash = "/dashboard";
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log("[auth] event:", event, "user:", session?.user?.id ?? null);
        setIsAuthed(!!session);
        window.location.hash = session ? "/dashboard" : "/auth";
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // optional tiny log
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      console.log("[auth] current user:", data.session?.user?.id ?? null);
    })();
  }, []);

  // --- 4) Nav helpers
  const goToDashboard = () => (window.location.hash = "/dashboard");
  const goHome = () => (window.location.hash = "/");
  const openWall = (w: Wall) => {
    setActiveWall(w);
    window.location.hash = "/wall";
  };

  // --- 5) Gate rendering while checking session
  if (isAuthed === null) return null;

  // If there’s a code in the URL, let the exchange effect handle it (don’t route).
  const hasOauthCode = new URL(window.location.href).searchParams.get("code");

  // --- 6) Unauthed views
  if (!isAuthed) {
    if (hasOauthCode) return null; // do not interrupt the exchange

    // protect private routes
    if (route === "dashboard" || route === "wall") {
      window.location.hash = "/auth";
      return null;
    }

    // allow SPA callback component if someone lands at #/auth/callback directly
    if (route === "authcb") return <AuthCallback />;

    if (route === "auth") return <AuthView />;
    return <Landing />;
  }

  // --- 7) Authed routes
  if (route === "dashboard") {
    return (
      <Dashboard
        goHome={goHome}
        onOpenWall={openWall}
        selectedProfileId={selectedProfileId}
        onSelectProfile={setSelectedProfileId}
      />
    );
  }

  if (route === "wall" && activeWall) {
    return <WallView wall={activeWall} onBack={goToDashboard} />;
  }

  // If authenticated and on auth/authcb, bounce to dashboard.
  if (route === "auth" || route === "authcb") {
    goToDashboard();
    return null;
  }

  // default
  goToDashboard();
  return null;
}
