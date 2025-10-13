// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WallView from "./pages/WallView";
import AuthView from "./pages/Auth";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Wall } from "./types";
import { XR_RUNTIME, IS_SPATIAL, XR_ENV_BUILD } from "./env";

type Route = "landing" | "dashboard" | "wall" | "auth";

// 🔧 TEMP switch — set to true to bypass auth
const AUTH_BYPASS = false;

const getRoute = (): Route => {
  const h = window.location.hash;
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
  if (h.startsWith("#/auth")) return "auth";
  // Default to dashboard when bypassing auth
  return AUTH_BYPASS ? "dashboard" : "landing";
};

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isAuthed, setIsAuthed] = useState<boolean | null>(
    AUTH_BYPASS ? true : null
  );

  useEffect(() => {
    document.documentElement.classList.toggle("is-spatial", IS_SPATIAL);
    console.log(
      "[XR] runtime:",
      XR_RUNTIME,
      "| build:",
      XR_ENV_BUILD,
      "| isSpatial:",
      IS_SPATIAL
    );
  }, []);

  // Simple hash router
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // 🔒 Auth boot + listener — skip entirely when bypassing
  useEffect(() => {
    if (AUTH_BYPASS) {
      // Ensure we land on dashboard
      if (
        !window.location.hash ||
        window.location.hash === "#/" ||
        window.location.hash === "#"
      ) {
        window.location.hash = "/dashboard";
      }
      return;
    }

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
      (_evt: AuthChangeEvent, session: Session | null) => {
        setIsAuthed(!!session);
        window.location.hash = session ? "/dashboard" : "/auth";
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Nav helpers
  const goToDashboard = () => (window.location.hash = "/dashboard");
  const goHome = () => (window.location.hash = "/");
  const openWall = (w: Wall) => {
    setActiveWall(w);
    window.location.hash = "/wall";
  };

  // While checking session (non-bypass only)
  if (!AUTH_BYPASS && isAuthed === null) return null;

  // 🚪 When bypassing, always render private routes
  if (AUTH_BYPASS) {
    if (route === "wall" && activeWall) {
      return <WallView wall={activeWall} onBack={goToDashboard} />;
    }
    // Default: Dashboard
    return (
      <Dashboard
        goHome={goHome}
        onOpenWall={openWall}
        selectedProfileId={selectedProfileId}
        onSelectProfile={setSelectedProfileId}
      />
    );
  }

  // 🔐 Normal auth-gated rendering (unchanged)
  if (!isAuthed) {
    if (route === "dashboard" || route === "wall") {
      window.location.hash = "/auth";
      return null;
    }
    if (route === "auth") return <AuthView />;
    return (
      <Landing
        onPrimary={() => (window.location.hash = "/auth")}
        onViewWalls={() => (window.location.hash = "/auth")}
      />
    );
  }

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

  if (route === "auth") {
    goToDashboard();
    return null;
  }

  goToDashboard();
  return null;
}
