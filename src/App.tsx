// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WallView from "./pages/WallView";
import AuthView from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback"; // optional safety route
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Wall } from "./types";

type Route = "landing" | "dashboard" | "wall" | "auth" | "authcb";

// Simple hash router
const getRoute = (): Route => {
  const h = window.location.hash;
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
  if (h.startsWith("#/auth/callback")) return "authcb";
  if (h.startsWith("#/auth")) return "auth";
  return "landing";
};

export default function App() {
  console.log("[APP] render");

  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null); // null = boot
  const [processingOauth, setProcessingOauth] = useState(false);

  // -------- 1) If we returned with ?code=..., exchange BEFORE anything else
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const providerToken = url.searchParams.get("provider_token");
    const refreshToken = url.searchParams.get("refresh_token");

    if (!code && !providerToken && !refreshToken) return;

    console.log("[oauth] params found:", {
      code: !!code,
      providerToken: !!providerToken,
      refreshToken: !!refreshToken,
      href: url.toString(),
    });

    setProcessingOauth(true);

    (async () => {
      try {
        // Manual PKCE exchange (detectSessionInUrl is false in the client)
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          url.toString()
        );
        if (error) {
          console.error("[oauth] exchange failed:", error.message);
          // show auth screen so user can retry
          window.location.hash = "/auth";
        } else {
          console.log("[oauth] exchange OK → user:", data.session?.user?.id);
          // Strip query so we don't retry endlessly on refresh
          url.search = "";
          window.history.replaceState({}, "", url.toString());
          window.location.hash = "/dashboard";
        }
      } catch (e) {
        console.error("[oauth] unexpected error:", e);
        window.location.hash = "/auth";
      } finally {
        setProcessingOauth(false);
      }
    })();
  }, []);

  // Freeze UI while doing the PKCE exchange (prevents any redirects/routing)
  if (processingOauth) {
    console.log("[oauth] processing… UI frozen");
    return null;
  }

  // -------- 2) Router
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // -------- 3) Boot: read session, then subscribe to auth changes
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      console.log("[auth] boot session user:", data.session?.user?.id ?? null);
      setIsAuthed(!!data.session);
      if (data.session && getRoute() === "landing") {
        window.location.hash = "/dashboard";
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evt: AuthChangeEvent, session: Session | null) => {
        console.log("[auth] event:", evt, "user:", session?.user?.id ?? null);
        setIsAuthed(!!session);
        window.location.hash = session ? "/dashboard" : "/auth";
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Small heartbeat log
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      console.log("[auth] heartbeat user:", data.session?.user?.id ?? null);
    })();
  }, []);

  // -------- 4) Helpers
  const goToDashboard = () => (window.location.hash = "/dashboard");
  const goHome = () => (window.location.hash = "/");
  const openWall = (w: Wall) => {
    setActiveWall(w);
    window.location.hash = "/wall";
  };

  // Wait while we decide auth state
  if (isAuthed === null) return null;

  // If there’s a code in the URL, DO NOT render anything except the exchanger above
  const hasOauthCode = new URL(window.location.href).searchParams.get("code");
  if (hasOauthCode) {
    console.log("[oauth] code still present → returning null to avoid race");
    return null;
  }

  // -------- 5) Unauthed
  if (!isAuthed) {
    // Protect private routes
    if (route === "dashboard" || route === "wall") {
      window.location.hash = "/auth";
      return null;
    }
    // Allow SPA callback route to render if someone manually hits it
    if (route === "authcb") return <AuthCallback />;
    if (route === "auth") return <AuthView />;
    return <Landing />;
  }

  // -------- 6) Authed
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

  // If authenticated and on auth/authcb, bounce to dashboard
  if (route === "auth" || route === "authcb") {
    goToDashboard();
    return null;
  }

  // Default
  goToDashboard();
  return null;
}
