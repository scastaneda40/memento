// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Wall } from "../types";
import CreateWallModal from "../components/CreateWallModal";
import "../webspatial.css";
import "../dashboard.css";

export default function Dashboard({
  goHome,
  onOpenWall,
}: {
  goHome: () => void;
  onOpenWall: (w: Wall) => void;
}) {
  const [open, setOpen] = useState(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});
  const [countMap, setCountMap] = useState<Record<string, number>>({});

  // 1) Load walls on mount
  useEffect(() => {
    (async () => {
      const { data: wallRows, error } = await supabase
        .from("walls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !wallRows) {
        console.warn("load walls error:", error);
        return;
      }

      setWalls(wallRows as Wall[]);
    })();
  }, []);

  // 2) Whenever walls change, fetch their mementos and build cover/count maps
  useEffect(() => {
    (async () => {
      if (!walls.length) {
        setCoverMap({});
        setCountMap({});
        return;
      }

      const wallIds = walls.map((w) => w.id);

      // If RLS blocks this, you’ll see an error in the console
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

        // pick first *visual* memento as cover (newest-first list)
        if (!covers[wid]) {
          if (mm.kind === "photo" && mm.media_url) {
            covers[wid] = mm.media_url;
          } else if (mm.kind === "video") {
            // prefer a thumb if you stored one; otherwise skip cover for video
            if (mm.thumb_url) covers[wid] = mm.thumb_url;
          }
        }
      }

      setCoverMap(covers);
      setCountMap(counts);
    })();
  }, [walls]);

  return (
    <div className="dashboard">
      <header className="dash-header" enable-xr-monitor="true">
        <div className="brand" onClick={goHome} enable-xr="true" data-z="40">
          Memento°
        </div>
        <button
          className="primary-btn"
          onClick={() => setOpen(true)}
          enable-xr="true"
          data-z="40"
        >
          + Create New Wall
        </button>
      </header>

      <main className="dash-main">
        <div className="title-row">
          <h1 className="title">My Walls</h1>
          <span className="meta">
            {walls.length} {walls.length === 1 ? "Wall" : "Walls"}
          </span>
        </div>

        <section className="card-grid" enable-xr-monitor="true">
          {walls.length === 0 ? (
            <div className="empty">No walls yet — create your first one.</div>
          ) : (
            walls.map((w) => {
              // prefer persisted cover on the wall, else derived cover from latest memento
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpenWall(w);
                  }}
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

      <CreateWallModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(w) => setWalls((ws) => [w, ...ws])}
      />
    </div>
  );
}
