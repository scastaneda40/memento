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

const getRoute = (): Route => {
  const h = window.location.hash;
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
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

  // in App.tsx (or main.tsx)
  useEffect(() => {
    // Apply or remove the CSS class so spatial styling kicks in
    document.documentElement.classList.toggle("is-spatial", IS_SPATIAL);

    // Log current runtime and build for sanity checks
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

  // Boot once, then react to auth changes
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
      (_evt: AuthChangeEvent, session: Session | null) => {
        // Optional log:
        // console.log("[auth] event:", evt, "user:", session?.user?.id ?? null);
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

  // Wait while checking session
  if (isAuthed === null) return null;

  // Unauthed views
  if (!isAuthed) {
    // Protect private routes
    if (route === "dashboard" || route === "wall") {
      window.location.hash = "/auth";
      return null;
    }
    if (route === "auth") {
      return <AuthView />;
    }
    return (
      <Landing
        onPrimary={() => (window.location.hash = "/auth")}
        onViewWalls={() => (window.location.hash = "/auth")}
      />
    );
  }

  // Authed routes
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

  // If authenticated and on /auth, bounce to dashboard
  if (route === "auth") {
    goToDashboard();
    return null;
  }

  // Default
  goToDashboard();
  return null;
}
