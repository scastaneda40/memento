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
  onBack: () => void;
}) {
  const [openMemento, setOpenMemento] = useState(false);
  const [mementos, setMementos] = useState<Memento[]>([]);

  // Load mementos
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("mementos")
        .select("*")
        .eq("wall_id", wall.id)
        .order("created_at", { ascending: true });
      if (!error && data) setMementos(data as Memento[]);
    })();
  }, [wall.id]);

  // Helpers
  //   const uploadToBucket = async (file: File, folder: string, key: string) => {
  //     const ext =
  //       (file.type && file.type.split("/")[1]) ||
  //       (file.name.split(".").pop() ?? "bin");
  //     const path = `${wall.id}/${folder}/${key}.${ext}`;
  //     const up = await supabase.storage.from("mementos").upload(path, file, {
  //       cacheControl: "3600",
  //       contentType: file.type || undefined,
  //       upsert: false,
  //     });
  //     if (up.error) throw up.error;
  //     return supabase.storage.from("mementos").getPublicUrl(path).data.publicUrl;
  //   };

  const BUCKET = "mementos";
  // Save from modal
  const handleSaveDraft = async (draft: MementoDraft) => {
    const tempId = crypto.randomUUID();
    const topZ =
      (mementos.length ? Math.max(...mementos.map((m) => m.z ?? 0)) : 0) + 1;

    // optimistic card
    const optimistic: Memento = {
      id: tempId,
      wall_id: wall.id,
      kind: draft.kind,
      title: draft.title ?? null,
      body: draft.text ?? null,
      media_url: draft.kind === "photo" ? draft.photo_preview ?? null : null, // video preview not shown
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
      // PHOTO upload
      if (draft.kind === "photo" && draft.photo_file) {
        const ext = draft.photo_file.type.split("/")[1] || "jpg";
        const path = `${draft.wall_id}/${tempId}-${Date.now()}.${ext}`;
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

      // VIDEO upload  ⬅️ make sure this exists
      if (draft.kind === "video" && draft.video_file) {
        const guess = draft.video_file.type || "video/mp4";
        const ext = guess.split("/")[1] || "mp4";
        const path = `${draft.wall_id}/${tempId}-${Date.now()}.${ext}`;
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

      // Optional: poster image for video
      if (draft.kind === "video" && draft.poster_file) {
        const pext = draft.poster_file.type.split("/")[1] || "jpg";
        const ppath = `${draft.wall_id}/${tempId}-${Date.now()}-poster.${pext}`;
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
      // rollback optimistic card
      setMementos((arr) => arr.filter((m) => m.id !== tempId));
    }
  };

  // Persist drag/resize
  const commitPosition = async (m: Memento) => {
    await supabase
      .from("mementos")
      .update({
        x: m.x,
        y: m.y,
        z: m.z,
        rotation_deg: m.rotation_deg,
        width: m.width ?? 260,
      })
      .eq("id", m.id);
  };

  return (
    <div className={`wall-view ${wall.background}`}>
      <header className="wall-header">
        <button className="back-btn" onClick={onBack}>
          ←
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
        +
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
