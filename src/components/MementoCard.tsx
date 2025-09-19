import { useMemo, useRef, useState } from "react";
import type { Memento } from "../types";
import "../memento.css";

export default function MementoCard({
  m,
  onChange,
  onCommit,
}: {
  m: Memento;
  onChange: (m: Memento) => void;
  onCommit: (m: Memento) => void | Promise<void>;
}) {
  // drag state
  const latest = useRef<Memento>(m);
  latest.current = m;

  const start = useRef<{ x: number; y: number; mx: number; my: number } | null>(
    null
  );
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const raised = { ...latest.current, z: 1_000_000 };
    latest.current = raised;
    onChange(raised);

    start.current = { x: raised.x, y: raised.y, mx: e.clientX, my: e.clientY };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !start.current) return;
    const dx = e.clientX - start.current.mx;
    const dy = e.clientY - start.current.my;
    const nx = Math.round((start.current.x + dx) / 12) * 12;
    const ny = Math.round((start.current.y + dy) / 12) * 12;
    const next = { ...latest.current, x: nx, y: ny };
    latest.current = next;
    onChange(next);
  };

  const endDrag = async () => {
    if (!dragging) return;
    setDragging(false);
    start.current = null;
    await onCommit(latest.current);
  };

  // float / tilt animation seeds
  const animVars = useMemo(
    () =>
      ({
        ["--float-delay" as any]: `${Math.random() * 2}s`,
        ["--float-dur" as any]: `${6 + Math.random() * 3}s`,
        ["--tilt" as any]: `${(Math.random() * 1.4 - 0.7).toFixed(2)}deg`,
      } as React.CSSProperties),
    []
  );

  // base card styling & rotation passed via CSS var
  const style: React.CSSProperties = {
    position: "absolute",
    left: m.x,
    top: m.y,
    width: m.width ?? 260,
    zIndex: dragging ? 999 : m.z ?? undefined, // ✅ no nulls
    ["--base-rot" as any]: `${m.rotation_deg ?? 0}deg`,
  };

  return (
    <div
      className={`memento-card animate-float${dragging ? " is-dragging" : ""}`}
      style={{ ...style, ...animVars }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={(e) => e.preventDefault()}
      enable-xr="true"
      data-z={m.z}
    >
      <div className="polaroid">
        {/* PHOTO */}
        {m.kind === "photo" && m.media_url && (
          <img
            className="polaroid-photo"
            src={m.media_url}
            alt={m.title ?? ""}
            draggable={false}
          />
        )}

        {/* VIDEO — native player from storage */}
        {m.kind === "video" && m.media_url && (
          <div className="polaroid-media">
            <video
              className="polaroid-video"
              src={m.media_url}
              poster={m.thumb_url || undefined}
              controls
              playsInline
              preload="metadata"
            />
          </div>
        )}

        {/* TEXT-ONLY */}
        {m.kind === "text" && (
          <div className="polaroid-caption" style={{ position: "static" }}>
            {m.title && <div className="cap-title">{m.title}</div>}
            {m.body && <div className="cap-body">{m.body}</div>}
          </div>
        )}

        {/* Caption for photo/video */}
        {m.kind !== "text" && (m.title || m.body) && (
          <div className="polaroid-caption">
            {m.title && <div className="cap-title">{m.title}</div>}
            {m.body && <div className="cap-body">{m.body}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
