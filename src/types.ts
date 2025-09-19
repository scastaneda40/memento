// src/types.ts

export type WallBackground = "serene-sky" | "warm-canvas" | "dark-tribute";

export type MementoKind = "text" | "photo" | "video";

export type Wall = {
  id: string;
  title: string;
  background: WallBackground;
  created_at: string; // ISO string from DB
  updated_at?: string | null;

  // optional / derived fields
  image_url?: string | null; // dashboard card preview (may be null)
  memento_count?: number | null; // shown on dashboard
};

export type Memento = {
  id: string;
  wall_id: string;
  kind: MementoKind;

  title: string | null;
  body: string | null;

  // media
  media_url: string | null; // photo URL or video URL (from storage)
  thumb_url: string | null; // poster image for video (optional)

  // layout
  x: number;
  y: number;
  z: number | null; // stacking
  rotation_deg: number | null;
  width?: number | null;

  created_at: string; // ISO
  updated_at: string | null;
};
