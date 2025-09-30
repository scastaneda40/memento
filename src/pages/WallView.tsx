// src/pages/WallView.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Wall, Memento } from "../types";
import CreateMementoModal from "../components/CreateMementoModal";
import type { MementoDraft } from "../components/CreateMementoModal";
import MementoCard from "../components/MementoCard";
import "../wall.css";

export default function WallView({
  wall,
  onBack,
}: {
  wall: Wall;
  onBack: (profileId: string | null) => void; // send profile on Back
}) {
  const [openMemento, setOpenMemento] = useState(false);
  const [mementos, setMementos] = useState<Memento[]>([]);

  // auth guard
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!ignore) {
        const uid = data.user?.id ?? null;
        setUserId(uid);
        setAuthReady(true);
        if (!uid) window.location.hash = "/auth";
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) window.location.hash = "/auth";
    });
    void init();
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load mementos for this wall
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

  const BUCKET = "mementos";

  // Save from modal (optimistic insert, then upload + DB insert)
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
      // Optional: namespace uploads by user + wall
      const basePrefix = `${userId ?? "anon"}/${draft.wall_id}`;

      // PHOTO upload
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

      // VIDEO upload
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

      // Optional poster for video
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

      // Insert DB row (include user_id if your RLS expects it)
      const { data, error } = await supabase
        .from("mementos")
        .insert({
          user_id: userId, // ← if you added this column; harmless if your policy uses walls.owner
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

      // Swap optimistic with real
      setMementos((arr) =>
        arr.map((m) => (m.id === tempId ? (data as Memento) : m))
      );
    } catch (err) {
      console.error("Upload/insert failed:", err);
      // rollback optimistic card
      setMementos((arr) => arr.filter((m) => m.id !== tempId));
    }
  };

  // Persist drag/resize
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

  // Delete
  const handleDeleteMemento = async (mm: Memento) => {
    setMementos((prev) => prev.filter((x) => x.id !== mm.id));
    const { error } = await supabase.from("mementos").delete().eq("id", mm.id);
    if (error) {
      console.error("Delete failed:", error);
      // rollback if needed
      setMementos((prev) =>
        [...prev, mm].sort((a, b) => (a.created_at! < b.created_at! ? -1 : 1))
      );
    }
  };

  if (!authReady) {
    return (
      <div className={`wall-view ${wall.background}`}>
        <header className="wall-header">
          <button
            className="back-btn"
            aria-label="Back"
            onClick={() => onBack(wall.profile_id ?? null)}
          >
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
        <main className="wall-main">Loading…</main>
      </div>
    );
  }

  return (
    <div className={`wall-view ${wall.background}`}>
      <header className="wall-header">
        <button
          className="back-btn"
          onClick={() => onBack(wall.profile_id ?? null)} // keep selection on return
          aria-label="Back"
        >
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
  );
}
