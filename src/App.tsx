// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
// import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WallView from "./pages/WallView";
import AuthView from "./pages/Auth";
import type { Wall } from "./types";

type Route = "landing" | "dashboard" | "wall" | "auth";

// --- Normalize hash to always be "#/<route>" (adds the "/" if missing)
const normalizeHash = () => {
  const h = window.location.hash;
  // if it's "#dashboard" or "#wall" or "#auth", convert to "#/dashboard" etc.
  if (/^#(dashboard|wall|auth)(\b|\/|$)/.test(h)) {
    const fixed = h.replace(/^#/, "#/");
    if (fixed !== h) window.location.hash = fixed;
    return fixed;
  }
  return h;
};

const getRoute = (): Route => {
  const h = normalizeHash(); // <-- use the normalized value
  if (h.startsWith("#/dashboard")) return "dashboard";
  if (h.startsWith("#/wall")) return "wall";
  if (h.startsWith("#/auth")) return "auth";
  return "landing";
};

// const isOauthReturn = () => window.location.hash.startsWith("#/oauth");

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

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

  useEffect(() => {
    // Handle PKCE return at #/oauth?code=...&state=...
    const hash = window.location.hash; // e.g. "#/oauth?code=xxx&state=yyy"
    if (hash.startsWith("#/oauth")) {
      // pull the query part after "#/oauth"
      const q = hash.split("?")[1] || "";
      const params = new URLSearchParams(q);
      const code = params.get("code");
      if (code) {
        // Supabase will read code_verifier from its storage and create the session
        supabase.auth
          .exchangeCodeForSession(code)
          .then(() => {
            window.location.hash = "/dashboard";
          })
          .catch(() => {
            window.location.hash = "/auth";
          });
      } else {
        // no code? just send to auth
        window.location.hash = "/auth";
      }
    }
  }, []);

  // Auth bootstrap + listener
  useEffect(() => {
    (async () => {
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

  // While booting auth, render nothing (or a tiny splash)
  if (isAuthed === null) return null;

  // If NOT signed in, force /auth for any route except /auth
  if (!isAuthed) {
    if (route !== "auth") {
      window.location.hash = "/auth";
      return null; // wait one tick for the hashchange/router to render AuthView
    }
    return <AuthView />; // already on /auth
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
