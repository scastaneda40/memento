// src/pages/Dashboard.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Wall, Profile } from "../types";
import CreateWallModal from "../components/CreateWallModal";
import CreateProfileModal from "../components/CreateProfileModal";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import AccountMenu from "../components/AccountMenu";
import { IS_SPATIAL } from "../env";
import "../webspatial.css";
import "../dashboard.css";

const spatialClear: React.CSSProperties = {
  background: "transparent",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "none",
  border: "none",
};

export default function Dashboard({
  goHome,
  onOpenWall,
  selectedProfileId,
  onSelectProfile,
}: {
  goHome: () => void;
  onOpenWall: (w: Wall) => void;
  selectedProfileId: string | null;
  onSelectProfile: (id: string | null) => void;
}) {
  const [openWall, setOpenWall] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [walls, setWalls] = useState<Wall[]>([]);
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // ---- Profile menu (dialog in Top Layer)
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const positionMenu = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: Math.round(r.bottom + 8),
      left: Math.round(r.left),
      width: Math.max(220, Math.round(r.width)),
    });
  }, []);

  // Open/close dialog and immediately force geometry after show()
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    if (menuOpen) {
      if (!dlg.open) dlg.show(); // <-- non-modal (was showModal)
      dlg.style.position = "fixed";
      dlg.style.margin = "0";
      (dlg.style as any).inset = "auto";
      dlg.style.top = `${menuPos.top}px`;
      dlg.style.left = `${menuPos.left}px`;
      dlg.style.minWidth = `${menuPos.width}px`;
      dlg.style.zIndex = "9999";
      document.documentElement.classList.add("menu-open");
    } else if (dlg.open) {
      dlg.close();
      document.documentElement.classList.remove("menu-open");
    }
  }, [menuOpen, menuPos]);

  // Keep positioned on scroll/resize while open
  useEffect(() => {
    if (!menuOpen) return;
    const sync = () => {
      positionMenu();
      const dlg = dialogRef.current;
      if (!dlg) return;
      dlg.style.top = `${menuPos.top}px`;
      dlg.style.left = `${menuPos.left}px`;
      dlg.style.minWidth = `${menuPos.width}px`;
    };
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [menuOpen, menuPos, positionMenu]);

  // Close on outside click (capture) / Esc
  useEffect(() => {
    if (!menuOpen) return;

    const onDocDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (dialogRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    // capture phase ensures we always get the outside click
    document.addEventListener("pointerdown", onDocDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Prevent dialog internal clicks from bubbling to the document listener
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handler = (e: MouseEvent) => e.stopPropagation();
    dlg.addEventListener("click", handler);
    return () => dlg.removeEventListener("click", handler);
  }, []);

  // ---- Auth
  useEffect(() => {
    let ignore = false;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!ignore) {
        setUserId(data.user?.id ?? null);
        setAuthReady(true);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUserId(session?.user?.id ?? null);
      }
    );
    void init();
    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // ---- Load profiles
  useEffect(() => {
    if (!authReady || !userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .order("display_name", { ascending: true });
      if (!error && data) setProfiles(data as Profile[]);
      else setProfiles([]);
    })();
  }, [authReady, userId]);

  // ---- Sync selectedProfile object with id
  useEffect(() => {
    if (!profiles.length || !selectedProfileId) {
      setSelectedProfile(null);
      if (!selectedProfileId) return;
    }
    const found = profiles.find((p) => p.id === selectedProfileId) ?? null;
    setSelectedProfile(found);
  }, [profiles, selectedProfileId]);

  // ---- Load walls
  const loadWalls = useCallback(
    async (profileId: string | null) => {
      if (!userId) {
        setWalls([]);
        return;
      }
      let query = supabase
        .from("walls")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      query = profileId
        ? query.eq("profile_id", profileId)
        : query.is("profile_id", null);

      const { data: wallRows, error } = await query;
      if (error) {
        console.warn("[loadWalls] error:", error);
        setWalls([]);
        return;
      }
      setWalls((wallRows ?? []) as Wall[]);
    },
    [userId]
  );

  useEffect(() => {
    if (!authReady || userId === null) return;
    loadWalls(selectedProfileId ?? null);
  }, [authReady, userId, selectedProfileId, loadWalls]);

  // ---- Covers + counts
  useEffect(() => {
    (async () => {
      if (!walls.length) {
        setCoverMap({});
        setCountMap({});
        return;
      }
      const wallIds = walls.map((w) => w.id);
      const { data: mms, error } = await supabase
        .from("mementos")
        .select("wall_id, kind, media_url, thumb_url, created_at")
        .in("wall_id", wallIds)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("load mementos error:", error);
        setCoverMap({});
        setCountMap({});
        return;
      }
      const covers: Record<string, string> = {};
      const counts: Record<string, number> = {};
      for (const mm of (mms ?? []) as any[]) {
        const wid = mm.wall_id as string;
        counts[wid] = (counts[wid] ?? 0) + 1;
        if (!covers[wid]) {
          if (mm.kind === "photo" && mm.media_url) covers[wid] = mm.media_url;
          else if (mm.kind === "video" && mm.thumb_url)
            covers[wid] = mm.thumb_url;
        }
      }
      setCoverMap(covers);
      setCountMap(counts);
    })();
  }, [walls]);

  // Profile picker helpers
  const selectUnassigned = () => {
    onSelectProfile(null);
    setMenuOpen(false);
  };
  const selectProfile = (p: Profile) => {
    onSelectProfile(p.id);
    setMenuOpen(false);
    setSelectedProfile(p);
  };

  const titleText = selectedProfileId
    ? `${selectedProfile?.display_name ?? "Profile"}'s Walls`
    : "My Walls";

  if (!authReady) {
    return (
      <div className="dashboard" style={IS_SPATIAL ? spatialClear : undefined}>
        <header
          className="dash-header"
          style={IS_SPATIAL ? spatialClear : undefined}
        >
          <div className="brand">Memento°</div>
        </header>
        <main
          className="dash-main"
          style={IS_SPATIAL ? spatialClear : undefined}
        >
          Loading…
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard" style={IS_SPATIAL ? spatialClear : undefined}>
      <header
        className="dash-header"
        enable-xr-monitor
        style={IS_SPATIAL ? spatialClear : undefined}
      >
        <div className="brand" onClick={goHome} enable-xr data-z="40">
          Memento°
        </div>

        <div className="center-actions">
          <button
            className="primary-btn"
            onClick={() => setOpenProfile(true)}
            enable-xr="true"
            data-z="40"
          >
            <svg
              className="btn-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
                fill="currentColor"
              />
            </svg>
            New Profile
          </button>

          <button
            className="primary-btn"
            onClick={() => setOpenWall(true)}
            enable-xr
            data-z="40"
          >
            <svg
              className="btn-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Wall
          </button>
        </div>

        <div className="right-actions">
          <AccountMenu />
        </div>
      </header>

      <main className="dash-main" style={IS_SPATIAL ? spatialClear : undefined}>
        {/* Title Group with dialog-based profile picker */}
        <div className="title-row">
          <div className="title-group">
            {selectedProfile?.avatar_url && (
              <span className="avatar-wrap" aria-hidden>
                <img
                  className="title-avatar avatar-img"
                  src={selectedProfile.avatar_url}
                  alt=""
                />
              </span>
            )}

            <h1 className="title">{titleText}</h1>

            <span className="meta-count">
              {walls.length} {walls.length === 1 ? "Wall" : "Walls"}
            </span>

            <span className="title-picker">
              <button
                ref={buttonRef}
                className="title-picker-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Choose profile"
                onClick={(e) => {
                  e.stopPropagation();
                  positionMenu();
                  setMenuOpen((v) => !v);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <dialog
                ref={dialogRef}
                className="title-menu title-menu--dialog"
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                  minWidth: menuPos.width,
                }}
              >
                <div role="menu" aria-label="Choose profile">
                  <button
                    className="title-menu-item"
                    role="menuitem"
                    onClick={selectUnassigned}
                  >
                    My Walls (Unassigned)
                  </button>

                  <div className="title-menu-sep" />

                  {profiles.length === 0 ? (
                    <div className="title-menu-empty">No profiles yet</div>
                  ) : (
                    profiles.map((p) => (
                      <button
                        key={p.id}
                        className={
                          "title-menu-item" +
                          (selectedProfileId === p.id ? " is-active" : "")
                        }
                        role="menuitem"
                        onClick={() => selectProfile(p)}
                      >
                        <span className="menu-avatar">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" />
                          ) : (
                            <span className="menu-avatar-fallback">👤</span>
                          )}
                        </span>
                        <span>
                          {p.display_name ||
                            `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </dialog>
            </span>
          </div>
        </div>

        {/* Walls grid */}
        <section className="card-grid" enable-xr-monitor>
          {walls.length === 0 ? (
            <div className="empty">No walls yet — create your first one.</div>
          ) : (
            walls.map((w) => {
              const cover = w.image_url ?? coverMap[w.id];
              const count = countMap[w.id] ?? 0;
              return (
                <article
                  key={w.id}
                  className="card card--click"
                  enable-xr
                  data-z="30"
                  onClick={() => onOpenWall(w)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onOpenWall(w)}
                >
                  <div className="thumb">
                    {cover ? (
                      <img src={cover} alt={w.title} className="thumb-img" />
                    ) : (
                      <div className={w.background} />
                    )}
                    <div className="badge">
                      {count > 0
                        ? `${count} memento${count === 1 ? "" : "s"}`
                        : "Add your first memento"}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="card-title">{w.title}</div>
                    <div className="card-sub">
                      Created {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      {/* Create modals */}
      <CreateWallModal
        open={openWall}
        onClose={() => setOpenWall(false)}
        onCreated={(w) => setWalls((ws) => [w, ...ws])}
        profileId={selectedProfileId}
      />

      <CreateProfileModal
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        onCreated={(p) => {
          onSelectProfile(p.id);
          setOpenProfile(false);
          setProfiles((prev) =>
            prev.find((x) => x.id === p.id) ? prev : [p, ...prev]
          );
        }}
      />
    </div>
  );
}
