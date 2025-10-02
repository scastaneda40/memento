// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WallView from "./pages/WallView";
import AuthView from "./pages/Auth";
import type { Wall } from "./types";

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

  // 🔑 NEW: Exchange OAuth code for a session (PKCE callback)
  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        // optional: show a toast
        console.warn("OAuth error:", error);
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(
          code
        );
        if (exErr) {
          console.error("exchangeCodeForSession failed:", exErr.message);
        }
        // strip query params from the URL (keeps hash router intact)
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      }

      // after possible exchange, read current session
      const { data } = await supabase.auth.getSession();
      setIsAuthed(!!data.session);

      if (data.session && getRoute() === "landing") {
        window.location.hash = "/dashboard";
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const authed = !!session;
      setIsAuthed(authed);
      if (event === "SIGNED_IN") {
        window.location.hash = "/dashboard";
      } else if (event === "SIGNED_OUT") {
        window.location.hash = "/auth";
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Nav helpers
  const goToDashboard = () => (window.location.hash = "/dashboard");
  const goHome = () => (window.location.hash = "/");
  const openWall = (w: Wall) => {
    setActiveWall(w);
    setSelectedProfileId(w.profile_id ?? null);
    window.location.hash = "/wall";
  };

  if (isAuthed === null) return null;

  // If NOT signed in, only allow Landing and Auth
  if (!isAuthed) {
    // if someone navigates to /dashboard or /wall while unauthenticated → push to /auth
    if (route === "dashboard" || route === "wall") {
      window.location.hash = "/auth";
      return null; // stop rendering this frame
    }
    if (route === "auth") return <AuthView />;

    // Landing: both actions go to /auth
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
    return (
      <WallView
        wall={activeWall}
        onBack={(profileId) => {
          setSelectedProfileId(profileId ?? null);
          goToDashboard();
        }}
      />
    );
  }

  if (route === "auth") {
    goToDashboard();
    return null;
  }

  goToDashboard();
  return null;
}
