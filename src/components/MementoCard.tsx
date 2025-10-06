// src/components/MementoCard.tsx
import { useMemo, useRef, useState, useCallback } from "react";
import type { Memento } from "../types";
import "../memento.css";

type Corner = "nw" | "ne" | "sw" | "se";

export default function MementoCard({
  m,
  onChange,
  onCommit,
  onDelete,
  confirmDelete = true,
  showDelete = true,
}: {
  m: Memento;
  onChange: (m: Memento) => void;
  onCommit: (m: Memento) => void | Promise<void>;
  onDelete?: (m: Memento) => void | Promise<void>;
  confirmDelete?: boolean;
  showDelete?: boolean;
}) {
  const latest = useRef<Memento>(m);
  latest.current = m;

  const start = useRef<{ x: number; y: number; mx: number; my: number } | null>(
    null
  );
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<null | {
    corner: Corner;
    mx: number;
    my: number;
    x: number;
    y: number;
    w: number;
  }>(null);

  const [deleting, setDeleting] = useState(false);
  const isActionDown = useRef(false);

  const MIN_W = 160;
  const MAX_W = 640;
  const GRID = 12;

  // --- Drag
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-action="true"]')) return;
    if (target.closest('[data-resize="true"]')) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const raised = { ...latest.current, z: 1_000_000 };
    latest.current = raised;
    onChange(raised);

    start.current = { x: raised.x, y: raised.y, mx: e.clientX, my: e.clientY };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizing) {
      const { corner, mx, my, x, w } = resizing;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;

      let delta = dx;
      if (corner === "nw" || corner === "sw") delta = -dx;
      delta += (corner === "nw" || corner === "ne" ? -dy : dy) * 0.15;

      let nextW = Math.round((w + delta) / GRID) * GRID;
      nextW = Math.max(MIN_W, Math.min(MAX_W, nextW));

      let nextX = x;
      if (corner === "nw" || corner === "sw") {
        nextX = Math.round((x + (w - nextW)) / GRID) * GRID;
      }

      const next = { ...latest.current, x: nextX, width: nextW };
      latest.current = next;
      onChange(next);
      return;
    }

    if (!dragging || !start.current) return;
    const dx = e.clientX - start.current.mx;
    const dy = e.clientY - start.current.my;
    const nx = Math.round((start.current.x + dx) / GRID) * GRID;
    const ny = Math.round((start.current.y + dy) / GRID) * GRID;
    const next = { ...latest.current, x: nx, y: ny };
    latest.current = next;
    onChange(next);
  };

  const endDrag = async () => {
    if (isActionDown.current) return;
    if (resizing) {
      setResizing(null);
      await onCommit(latest.current);
      return;
    }
    if (!dragging) return;
    setDragging(false);
    start.current = null;
    await onCommit(latest.current);
  };

  // --- Resize
  type Dir = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const dir = (e.currentTarget.dataset.dir || "") as Dir;
    if (!dir || dir === "n" || dir === "s") return;

    e.stopPropagation();
    e.preventDefault();

    (e.currentTarget.parentElement as HTMLElement | null)
      ?.closest(".memento-card")
      ?.setPointerCapture?.(e.pointerId);

    const m0 = latest.current;

    const corner: Corner =
      dir === "ne"
        ? "ne"
        : dir === "nw"
        ? "nw"
        : dir === "se"
        ? "se"
        : dir === "sw"
        ? "sw"
        : dir === "e"
        ? "se"
        : "sw";

    setResizing({
      corner,
      mx: e.clientX,
      my: e.clientY,
      x: m0.x,
      y: m0.y,
      w: m0.width ?? 260,
    });
  };

  // --- Delete
  const doDelete = useCallback(async () => {
    if (deleting) return;
    if (typeof onDelete !== "function") {
      console.warn("[MementoCard] onDelete missing");
      return;
    }
    if (confirmDelete) {
      const ok = window.confirm("Delete this Memento? This cannot be undone.");
      if (!ok) return;
    }
    try {
      setDeleting(true);
      await onDelete(latest.current);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, confirmDelete, deleting]);

  // --- Keys
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (!dragging && !resizing) void doDelete();
    }
  };

  // --- Pointer-blocker for actions
  const markAction = (down: boolean) => (e: React.PointerEvent) => {
    e.stopPropagation();
    isActionDown.current = down;
  };

  const animVars = useMemo(
    () =>
      ({
        ["--float-delay" as any]: `${Math.random() * 2}s`,
        ["--float-dur" as any]: `${6 + Math.random() * 3}s`,
        ["--tilt" as any]: `${(Math.random() * 1.4 - 0.7).toFixed(2)}deg`,
      } as React.CSSProperties),
    []
  );

  const style: React.CSSProperties = {
    position: "absolute",
    left: m.x,
    top: m.y,
    width: m.width ?? 260,
    zIndex: dragging || resizing ? 999 : m.z ?? undefined,
    ["--base-rot" as any]: `${m.rotation_deg ?? 0}deg`,
  };

  return (
    <div
      className={`memento-card animate-float${dragging ? " is-dragging" : ""}${
        resizing ? " is-resizing" : ""
      }`}
      style={{ ...style, ...animVars }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      tabIndex={0}
      enable-xr="true"
      data-z={m.z}
      aria-label={m.title || "Memory card"}
    >
      <div className="polaroid">
        {m.kind === "photo" && m.media_url && (
          <img
            className="polaroid-photo"
            src={m.media_url}
            alt={m.title ?? ""}
            draggable={false}
          />
        )}
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
        {m.kind === "text" && (
          <div className="polaroid-caption" style={{ position: "static" }}>
            {m.title && <div className="cap-title">{m.title}</div>}
            {m.body && <div className="cap-body">{m.body}</div>}
          </div>
        )}
        {m.kind !== "text" && (m.title || m.body) && (
          <div className="polaroid-caption">
            {m.title && <div className="cap-title">{m.title}</div>}
            {m.body && <div className="cap-body">{m.body}</div>}
          </div>
        )}
      </div>

      {/* Actions */}
      {showDelete && (
        <div
          className="card-actions"
          onPointerDown={markAction(true)}
          onPointerUp={markAction(false)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 6,
            zIndex: 9999,
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            data-card-action="true"
            aria-label="Delete memory"
            title="Delete"
            disabled={deleting}
            onPointerDown={markAction(true)}
            onPointerUp={markAction(false)}
            onClick={(e) => {
              e.stopPropagation();
              void doDelete();
            }}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: 8,
              background: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "6px 8px",
              cursor: "pointer",
              lineHeight: 0,
            }}
          >
            {deleting ? (
              "Deleting…"
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M3 6h18v2H3V6zm2 3h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 9zm5-6h4l1 2H9l1-2z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Resize handles */}
      {["n", "e", "s", "w", "nw", "ne", "se", "sw"].map((dir) => (
        <div
          key={dir}
          className={`rz-${
            dir.includes("n") || dir.includes("s") ? "edge" : "corner"
          } rz-${dir}`}
          data-resize="true"
          data-dir={dir}
          onPointerDown={onResizeStart}
        />
      ))}

      <div className="rz-sizechip" aria-hidden>
        {Math.round(m.width ?? 260)}×{Math.round(((m.width ?? 260) * 9) / 16)}
      </div>
    </div>
  );
}
