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

// src/App.tsx (only the routing bits shown)

type Route = "landing" | "dashboard" | "wall" | "auth" | "authcb";

// Hash router for app views
const getRoute = (): Route => {
  const h = window.location.hash;
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
  if (h.startsWith("#/auth/callback")) return "authcb"; // <-- correct path
  if (h.startsWith("#/auth")) return "auth";
  return "landing";
};

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // session boot + auth change handling (your existing code is fine)
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
        setIsAuthed(!!session);
        window.location.hash = session ? "/dashboard" : "/auth";
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ---- unauthenticated view gating
  if (isAuthed === null) return null;

  if (!isAuthed) {
    if (route === "dashboard" || route === "wall") {
      window.location.hash = "/auth";
      return null;
    }
    if (route === "authcb") return <AuthCallback />; // let PKCE exchange run
    if (route === "auth") return <AuthView />;
    return <Landing />;
  }

  // ---- authenticated routes
  if (route === "dashboard") {
    return (
      <Dashboard
        goHome={() => (window.location.hash = "/")}
        onOpenWall={(w) => {
          setActiveWall(w);
          window.location.hash = "/wall";
        }}
        selectedProfileId={selectedProfileId}
        onSelectProfile={setSelectedProfileId}
      />
    );
  }

  if (route === "wall" && activeWall) {
    return (
      <WallView
        wall={activeWall}
        onBack={() => (window.location.hash = "/dashboard")}
      />
    );
  }

  if (route === "auth" || route === "authcb") {
    window.location.hash = "/dashboard";
    return null;
  }

  window.location.hash = "/dashboard";
  return null;
}
