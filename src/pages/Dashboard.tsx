// src/pages/Dashboard.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Wall, Profile } from "../types";
import CreateWallModal from "../components/CreateWallModal";
import CreateProfileModal from "../components/CreateProfileModal";
import "../webspatial.css";
import "../dashboard.css";

export default function Dashboard({
  goHome,
  onOpenWall,
}: {
  goHome: () => void;
  onOpenWall: (w: Wall) => void;
}) {
  const [openWall, setOpenWall] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [walls, setWalls] = useState<Wall[]>([]);
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});
  const [countMap, setCountMap] = useState<Record<string, number>>({});

  const [profiles, setProfiles] = useState<Profile[]>([]);

  // dropdown state/refs
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ---- Load profiles once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("display_name", { ascending: true });
      if (!error && data) setProfiles(data as Profile[]);
    })();
  }, []);

  // ---- Walls loader (filtered by profile or unassigned)
  const loadWalls = useCallback(async (profileId?: string | null) => {
    const query = supabase
      .from("walls")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileId) query.eq("profile_id", profileId);
    else query.is("profile_id", null); // "My Walls (Unassigned)"

    const { data: wallRows, error } = await query;
    if (error || !wallRows) {
      console.warn("load walls error:", error);
      setWalls([]);
      return;
    }
    setWalls(wallRows as Wall[]);
  }, []);

  // Initial: show unassigned
  useEffect(() => {
    loadWalls(null);
  }, [loadWalls]);

  // Re-load when selection changes
  useEffect(() => {
    loadWalls(selectedProfile?.id ?? null);
  }, [selectedProfile, loadWalls]);

  // Build covers + counts per wall
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

  // --- dropdown behavior: outside click + Escape
  useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Selections
  const selectUnassigned = () => {
    setSelectedProfile(null);
    setMenuOpen(false);
  };
  const selectProfile = (p: Profile) => {
    setSelectedProfile(p);
    setMenuOpen(false);
  };

  const titleText = selectedProfile
    ? `${selectedProfile.display_name}'s Walls`
    : "My Walls";

  return (
    <div className="dashboard">
      <header className="dash-header" enable-xr-monitor="true">
        <div className="brand" onClick={goHome} enable-xr="true" data-z="40">
          Memento°
        </div>

        <div className="dash-actions">
          {/* New Profile */}
          <button
            className="primary-btn"
            onClick={() => setOpenProfile(true)}
            enable-xr="true"
            data-z="40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="btn-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            New Profile
          </button>

          {/* New Wall – passes selected profile id */}
          <button
            className="primary-btn"
            onClick={() => setOpenWall(true)}
            enable-xr="true"
            data-z="40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="btn-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 5v14m-7-7h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Wall
          </button>
        </div>
      </header>

      <main className="dash-main">
        {/* Title Group with square chevron menu */}
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
                onClick={() => setMenuOpen((v) => !v)} // toggles open/close
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
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

              {menuOpen && (
                <div className="title-menu" ref={menuRef} role="menu">
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
                          (selectedProfile?.id === p.id ? " is-active" : "")
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
              )}
            </span>
          </div>
        </div>

        {/* Grid of walls */}
        <section className="card-grid" enable-xr-monitor="true">
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
                  enable-xr="true"
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

      {/* Create Wall (assign to selected profile if present) */}
      <CreateWallModal
        open={openWall}
        onClose={() => setOpenWall(false)}
        onCreated={(w) => setWalls((ws) => [w, ...ws])}
        profileId={selectedProfile?.id ?? null}
      />

      {/* Create Profile (after create, switch to it) */}
      <CreateProfileModal
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        onCreated={(p) => {
          setSelectedProfile(p);
          setOpenProfile(false);
          // ensure it appears in the list immediately
          setProfiles((prev) =>
            prev.find((x) => x.id === p.id) ? prev : [p, ...prev]
          );
        }}
      />
    </div>
  );
}
