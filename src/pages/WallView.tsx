import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import type { Wall, Memento } from "../types";
import CreateMementoModal, {
  type MementoDraft,
} from "../components/CreateMementoModal";
import MementoCard from "../components/MementoCard";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  setPanelPose,
  showWallPanelAndPlaceOnce,
  onSystemPoseChanged,
  type Pose,
} from "../spatial/place";
import "../wall.css";

// yaw <-> quat helpers (for persistence)
function quatFromYaw(yawRad: number): [number, number, number, number] {
  const h = yawRad / 2;
  return [0, Math.sin(h), 0, Math.cos(h)];
}
function yawFromQuat(q: [number, number, number, number]): number {
  const [, y, , w] = q;
  return 2 * Math.atan2(y, w);
}
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// CSS fallback so UI visibly responds even without a bound panel
function applyCssFallbackTransform(
  el: HTMLElement,
  depth: number,
  yawDeg: number,
  scale: number
) {
  el.style.transformOrigin = "50% 50%";
  el.style.transform = `perspective(1200px) rotateY(${yawDeg}deg) scale(${scale})`;
  el.style.filter = `blur(${Math.max(0, depth - 1).toFixed(2)}px)`;
}

export default function WallView({
  wall,
  onBack,
}: {
  wall: Wall;
  onBack: () => void;
}) {
  // ---------- auth ----------
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!ignore) {
        setUserId(data.user?.id ?? null);
        setAuthReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: AuthChangeEvent, session: Session | null) =>
        setUserId(session?.user?.id ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------- spatial ----------
  const rootRef = useRef<HTMLDivElement | null>(null);

  // live isSpatial (responds if the class toggles after boot)
  const [isSpatial, setIsSpatial] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("is-spatial");
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const update = () => setIsSpatial(el.classList.contains("is-spatial"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ---------- pose state (for UI + persistence) ----------
  const [depth, setDepth] = useState(1.0); // meters (UI positive; stage uses -Z)
  const [yawDeg, setYawDeg] = useState(0); // -35..35
  const [scale, setScale] = useState(1.0); // 0.7..1.6
  const saveTimer = useRef<number | null>(null);

  // Persist (debounced)
  function persistPose(d: number, y: number, s: number) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await supabase
        .from("walls")
        .update({
          pose_position: [0, 0, -d] as [number, number, number],
          pose_rotation: quatFromYaw((y * Math.PI) / 180),
          pose_scale: s,
        })
        .eq("id", wall.id);
    }, 250) as unknown as number;
  }

  // Read saved pose + create/rebind panel once, then apply
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rootRef.current) return;

      const { data } = await supabase
        .from("walls")
        .select("pose_position, pose_rotation, pose_scale")
        .eq("id", wall.id)
        .single();

      const pos =
        (data?.pose_position as [number, number, number] | null) ?? null;
      const rot =
        (data?.pose_rotation as [number, number, number, number] | null) ??
        null;
      const scl = (data?.pose_scale as number | null) ?? null;

      const nextDepth = pos ? Math.abs(pos[2]) : depth;
      const nextYaw = rot ? (yawFromQuat(rot) * 180) / Math.PI : yawDeg;
      const nextScale = typeof scl === "number" ? scl : scale;

      if (!cancelled) {
        setDepth(nextDepth);
        setYawDeg(nextYaw);
        setScale(nextScale);
      }

      const pose: Pose = {
        position: [0, 0, -nextDepth],
        rotation: quatFromYaw((nextYaw * Math.PI) / 180),
        scale: nextScale,
      };

      if (isSpatial) {
        await showWallPanelAndPlaceOnce(rootRef.current!, pose);
        await setPanelPose(rootRef.current!, pose);
      }
      applyCssFallbackTransform(
        rootRef.current!,
        nextDepth,
        nextYaw,
        nextScale
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wall.id, isSpatial]);

  // Listen to native bar drags -> sync state + persist
  useEffect(() => {
    onSystemPoseChanged((p) => {
      const d = clamp(Math.abs(p.position[2]), 0.35, 2.0);
      const y = clamp(
        Math.round(
          (2 * Math.atan2(p.rotation[1], p.rotation[3]) * 180) / Math.PI
        ),
        -35,
        35
      );
      const s = clamp(p.scale ?? 1, 0.7, 1.6);

      setDepth(d);
      setYawDeg(y);
      setScale(s);
      persistPose(d, y, s);

      if (rootRef.current) applyCssFallbackTransform(rootRef.current, d, y, s);
    });
    return () => onSystemPoseChanged(null);
  }, []);

  // Re-apply on any pose-state change
  useEffect(() => {
    if (!rootRef.current) return;
    const pose: Pose = {
      position: [0, 0, -depth],
      rotation: quatFromYaw((yawDeg * Math.PI) / 180),
      scale,
    };
    void setPanelPose(rootRef.current, pose);
    applyCssFallbackTransform(rootRef.current, depth, yawDeg, scale);
  }, [isSpatial, depth, yawDeg, scale]);

  // Update panel instantly via UI + save later
  function applyAndSave(next: {
    depth?: number;
    yawDeg?: number;
    scale?: number;
  }) {
    if (!rootRef.current) return;

    const d = clamp(next.depth ?? depth, 0.35, 2.0);
    const y = clamp(next.yawDeg ?? yawDeg, -35, 35);
    const s = clamp(next.scale ?? scale, 0.7, 1.6);

    setDepth(d);
    setYawDeg(y);
    setScale(s);

    const pose: Pose = {
      position: [0, 0, -d],
      rotation: quatFromYaw((y * Math.PI) / 180),
      scale: s,
    };

    void setPanelPose(rootRef.current, pose);
    applyCssFallbackTransform(rootRef.current, d, y, s);
    persistPose(d, y, s);
  }

  const snapBack = () => applyAndSave({ depth: 1.1, yawDeg: 0, scale: 1 });
  const resetPose = () => applyAndSave({ depth: 1.0, yawDeg: 0, scale: 1.0 });

  // ---------- data ----------
  const [mementos, setMementos] = useState<Memento[]>([]);
  useEffect(() => {
    if (!authReady || !userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("mementos")
        .select("*")
        .eq("wall_id", wall.id)
        .order("created_at", { ascending: true });
      if (!error && data) setMementos(data as Memento[]);
      else setMementos([]);
    })();
  }, [authReady, userId, wall.id]);

  // ---------- create/update/delete ----------
  const BUCKET = "mementos";
  const [openMemento, setOpenMemento] = useState(false);

  const handleSaveDraft = async (draft: MementoDraft) => {
    const tempId = crypto.randomUUID();
    const topZ =
      (mementos.length ? Math.max(...mementos.map((m) => m.z ?? 0)) : 0) + 1;

    const optimistic: Memento = {
      id: tempId,
      wall_id: wall.id,
      kind: draft.kind,
      title: draft.title ?? null,
      body: draft.text ?? null,
      media_url: draft.kind === "photo" ? draft.photo_preview ?? null : null,
      thumb_url: draft.kind === "video" ? draft.poster_preview ?? null : null,
      x: 140,
      y: 140,
      z: topZ,
      rotation_deg: Math.random() * 6 - 3,
      width: 260,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMementos((arr) => [optimistic, ...arr]);

    let finalMediaUrl: string | null = null;
    let finalThumbUrl: string | null = null;

    try {
      const basePrefix = `${userId ?? "anon"}/${draft.wall_id}`;

      if (draft.kind === "photo" && draft.photo_file) {
        const ext = draft.photo_file.type.split("/")[1] || "jpg";
        const path = `${basePrefix}/${tempId}-${Date.now()}.${ext}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, draft.photo_file, {
            cacheControl: "3600",
            contentType: draft.photo_file.type || "image/jpeg",
            upsert: false,
          });
        if (up.error) throw up.error;
        finalMediaUrl = supabase.storage.from(BUCKET).getPublicUrl(path)
          .data.publicUrl;
      }

      if (draft.kind === "video" && draft.video_file) {
        const guess = draft.video_file.type || "video/mp4";
        const ext = guess.split("/")[1] || "mp4";
        const path = `${basePrefix}/${tempId}-${Date.now()}.${ext}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, draft.video_file, {
            cacheControl: "3600",
            contentType: guess,
            upsert: false,
          });
        if (up.error) throw up.error;
        finalMediaUrl = supabase.storage.from(BUCKET).getPublicUrl(path)
          .data.publicUrl;
      }

      if (draft.kind === "video" && draft.poster_file) {
        const pext = draft.poster_file.type.split("/")[1] || "jpg";
        const ppath = `${basePrefix}/${tempId}-${Date.now()}-poster.${pext}`;
        const pup = await supabase.storage
          .from(BUCKET)
          .upload(ppath, draft.poster_file, {
            cacheControl: "3600",
            contentType: draft.poster_file.type || "image/jpeg",
            upsert: false,
          });
        if (pup.error) throw pup.error;
        finalThumbUrl = supabase.storage.from(BUCKET).getPublicUrl(ppath)
          .data.publicUrl;
      }

      const { data, error } = await supabase
        .from("mementos")
        .insert({
          user_id: userId,
          wall_id: draft.wall_id,
          kind: draft.kind,
          title: draft.title ?? null,
          body: draft.text ?? null,
          media_url: finalMediaUrl,
          thumb_url: finalThumbUrl,
          x: optimistic.x,
          y: optimistic.y,
          z: topZ,
          rotation_deg: optimistic.rotation_deg,
          width: optimistic.width,
        })
        .select("*")
        .single();

      if (error) throw error;
      setMementos((arr) =>
        arr.map((m) => (m.id === tempId ? (data as Memento) : m))
      );
    } catch (err) {
      console.error("Upload/insert failed:", err);
      setMementos((arr) => arr.filter((m) => m.id !== tempId));
    }
  };

  const commitPosition = async (m: Memento) => {
    const { error } = await supabase
      .from("mementos")
      .update({
        x: m.x,
        y: m.y,
        z: m.z,
        rotation_deg: m.rotation_deg,
        width: m.width ?? 260,
      })
      .eq("id", m.id);
    if (error) console.error("Update failed:", error);
  };

  const handleDeleteMemento = async (mm: Memento) => {
    setMementos((prev) => prev.filter((x) => x.id !== mm.id));
    const { error } = await supabase.from("mementos").delete().eq("id", mm.id);
    if (error) {
      console.error("Delete failed:", error);
      setMementos((prev) =>
        [...prev, mm].sort((a, b) => (a.created_at! < b.created_at! ? -1 : 1))
      );
    }
  };

  // ---------- HUD (portal; never rotates) ----------
  const Hud = !isSpatial
    ? // Web fallback: show Depth/Yaw/Scale since there’s no native handle
      () =>
        createPortal(
          <div style={hudBoxStyle}>
            <div style={hudTitleStyle}>Reposition Wall (web)</div>

            <label style={lblStyle}>Depth (m): {depth.toFixed(2)}</label>
            <input
              type="range"
              min={0.7}
              max={1.0}
              step={0.02}
              value={depth}
              onChange={(e) => applyAndSave({ depth: +e.currentTarget.value })}
              style={{ width: "100%" }}
            />

            <label style={lblStyle}>Yaw (°): {yawDeg.toFixed(0)}</label>
            <input
              type="range"
              min={-35}
              max={35}
              step={1}
              value={yawDeg}
              onChange={(e) => applyAndSave({ yawDeg: +e.currentTarget.value })}
              style={{ width: "100%" }}
            />

            <label style={lblStyle}>Scale: {scale.toFixed(2)}</label>
            <input
              type="range"
              min={0.7}
              max={1.2}
              step={0.01}
              value={scale}
              onChange={(e) => applyAndSave({ scale: +e.currentTarget.value })}
              style={{ width: "100%" }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={snapBack} style={btnStyle}>
                Snap Back
              </button>
              <button onClick={resetPose} style={btnStyle}>
                Reset
              </button>
            </div>
          </div>,
          document.body
        )
    : // Spatial: show ONLY Scale (Depth/Yaw handled by native bar) + Snap/Reset
      () =>
        createPortal(
          <div style={hudBoxStyle}>
            <div style={hudTitleStyle}>Scale & Presets</div>

            <label style={lblStyle}>Scale: {scale.toFixed(2)}</label>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.01}
              value={scale}
              onChange={(e) => applyAndSave({ scale: +e.currentTarget.value })}
              style={{ width: "100%" }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={snapBack} style={btnStyle}>
                Snap Back
              </button>
              <button onClick={resetPose} style={btnStyle}>
                Reset
              </button>
            </div>
            <div style={{ opacity: 0.8, marginTop: 6, fontSize: 11 }}>
              Tip: Use the floating bar to move/rotate the wall.
            </div>
          </div>,
          document.body
        );

  // ---------- render ----------
  return (
    <>
      <div ref={rootRef} className={`wall-view ${wall.background}`}>
        <header className="wall-header">
          <button className="back-btn" onClick={onBack} aria-label="Back">
            <svg
              className="icon"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="wall-title">{wall.title}</h1>
        </header>

        <main className="wall-main">
          {mementos.map((m) => (
            <MementoCard
              key={m.id}
              m={m}
              onChange={(next) =>
                setMementos((prev) =>
                  prev.map((x) =>
                    x.id === next.id ? { ...next, width: next.width ?? 260 } : x
                  )
                )
              }
              onCommit={commitPosition}
              onDelete={handleDeleteMemento}
            />
          ))}
          {mementos.length === 0 && (
            <div className="empty-state">Add your first memento</div>
          )}
        </main>

        <button
          className="fab"
          onClick={() => setOpenMemento(true)}
          aria-label="Add Memento"
        >
          <svg
            className="icon"
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <CreateMementoModal
          open={openMemento}
          onClose={() => setOpenMemento(false)}
          wall={wall}
          onSave={handleSaveDraft}
        />
      </div>

      <Hud />
    </>
  );
}

/* ----- inline styles for HUD (kept here to keep example self-contained) ----- */
const hudBoxStyle: React.CSSProperties = {
  position: "fixed",
  right: 16,
  top: 16,
  zIndex: 2147483000,
  padding: 12,
  borderRadius: 12,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.28)",
  WebkitBackdropFilter: "blur(8px) saturate(150%)",
  backdropFilter: "blur(8px) saturate(150%)",
  width: 260,
  fontSize: 12,
  lineHeight: 1.3,
};
const hudTitleStyle: React.CSSProperties = { fontWeight: 800, marginBottom: 8 };
const lblStyle: React.CSSProperties = {
  display: "block",
  margin: "10px 0 6px",
};
const btnStyle: React.CSSProperties = { padding: "6px 8px", borderRadius: 8 };
