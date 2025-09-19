import { useEffect, useState } from "react";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import WallView from "./pages/WallView";
import type { Wall } from "./types";

type Route = "landing" | "dashboard" | "wall";

const getRoute = (): Route => {
  const hash = window.location.hash;
  if (hash.startsWith("#/dashboard")) return "dashboard";
  if (hash.startsWith("#/wall")) return "wall";
  return "landing";
};

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [activeWall, setActiveWall] = useState<Wall | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const isSpatial = (window as any).XR_ENV === "avp";
    document.documentElement.classList.toggle("is-spatial", isSpatial);
  }, []);

  const goToDashboard = () => (window.location.hash = "/dashboard");
  const goHome = () => (window.location.hash = "/");
  const openWall = (w: Wall) => {
    setActiveWall(w);
    window.location.hash = "/wall";
  };

  return route === "landing" ? (
    <Landing onPrimary={goToDashboard} />
  ) : route === "dashboard" ? (
    <Dashboard goHome={goHome} onOpenWall={openWall} />
  ) : (
    <WallView wall={activeWall!} onBack={goToDashboard} />
  );
}
