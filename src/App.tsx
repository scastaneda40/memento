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

type Route = "landing" | "dashboard" | "wall" | "auth" | "auth-callback";

// Hash router for app views
const getRoute = (): Route => {
  const h = window.location.hash;
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
  if (h.startsWith("#/auth-callback")) return "auth-callback";
  if (h.startsWith("#/auth")) return "auth";
  return "landing";
};

// Path router for the OAuth return page (/auth/callback.html)
const isOauthCallbackPath = (): boolean =>
  window.location.pathname.endsWith("/auth/callback.html");

export default function App() {
  console.log("[APP] render");

  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null); // null = booting

  // If we’re on /auth/callback.html, just run the AuthCallback and bail.
  if (isOauthCallbackPath()) {
    return <AuthCallback />;
  }

  // Router
  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Spatial CSS toggle
  useEffect(() => {
    const isSpatial = (window as any).XR_ENV === "avp";
    document.documentElement.classList.toggle("is-spatial", isSpatial);
  }, []);

  // Boot: read session once, then react to auth changes
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthed(!!data.session);
      if (data.session && getRoute() === "landing") {
        window.location.hash = "/dashboard";
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setIsAuthed(!!session);
        if (session) {
          window.location.hash = "/dashboard";
        } else {
          window.location.hash = "/auth";
        }
      }
    );

    void init();
    return () => subscription.unsubscribe();
  }, []);

  // (optional) small log
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      console.log("[auth] user:", data.session?.user?.id);
    })();
  }, []);

  // Nav helpers
  const goToDashboard = () => (window.location.hash = "/dashboard");
  const goHome = () => (window.location.hash = "/");
  const openWall = (w: Wall) => {
    setActiveWall(w);
    window.location.hash = "/wall";
  };

  if (isAuthed === null) return null;

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
