// src/spatial/WallSpatial.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
// @ts-expect-error – adjust import path to your SDK
import * as WS from "webspatial-sdk"; // or wherever your sdk exports are
import { supabase } from "../lib/supabase";
import type { Pose } from "../spatial/place"; // reuse your Pose type

type Props = {
  wallId: string;
  children: React.ReactNode; // your wall UI/cards go here
  dev?: boolean;
};

export default function WallSpatial({ wallId, children, dev }: Props) {
  const [pose, setPose] = useState<Pose | null>(null);
  const [placing, setPlacing] = useState(false);
  const [needsPlacement, setNeedsPlacement] = useState(false);

  const isSpatial = useMemo(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("is-spatial"),
    []
  );

  // Load any saved pose once (you can keep this if you want auto-restore)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("walls")
        .select("pose_position, pose_rotation, pose_scale")
        .eq("id", wallId)
        .single();
      if (!error && data?.pose_position && data?.pose_rotation) {
        setPose({
          position: data.pose_position,
          rotation: data.pose_rotation,
          scale: data.pose_scale ?? 1,
        });
        setNeedsPlacement(false);
      } else {
        setPose(null);
        setNeedsPlacement(true);
      }
    })();
  }, [wallId]);

  // Helper to persist
  async function savePose(next: Pose) {
    await supabase
      .from("walls")
      .update({
        pose_position: next.position,
        pose_rotation: next.rotation,
        pose_scale: next.scale,
      })
      .eq("id", wallId);
  }

  // Enter placement mode (used both on first load if pose missing and on Reset)
  async function startPlacement() {
    if (!isSpatial || placing) return;
    setPlacing(true);
    setNeedsPlacement(true);

    const session = await WS.getSession(); // low-level access
    if (!session) {
      // Non-spatial fallback
      const fallback: Pose = {
        position: [0, 0, -1.2],
        rotation: [0, 0, 0, 1],
        scale: 1,
      };
      setPose(fallback);
      await savePose(fallback);
      setPlacing(false);
      setNeedsPlacement(false);
      return;
    }

    // Create hit test + reticle
    const hit = await session.createHitTestSource();
    const reticle = await session.createReticle?.();

    // “arm” so we don’t capture the button’s click
    const minMs = 900;
    const armedAt = performance.now();
    let hadFreshHit = false;
    let last: {
      position: Pose["position"];
      rotation: Pose["rotation"];
    } | null = null;

    // We’ll use SpatialMonitor to get frame/select
    let stop = () => {};

    const Monitor = () => (
      <WS.SpatialMonitor
        onFrame={(frame: any) => {
          const h = hit.getHit(frame);
          if (h) {
            if (performance.now() - armedAt >= minMs) hadFreshHit = true;
            last = { position: h.position, rotation: h.rotation };
            reticle?.setPose?.(h.position, h.rotation);
          }
        }}
        onSelect={() => {
          if (performance.now() - armedAt < minMs) return; // too soon
          if (!hadFreshHit || !last) return; // require valid fresh hit
          const next: Pose = {
            position: last.position,
            rotation: last.rotation,
            scale: 1,
          };
          cleanup();
          setPose(next);
          setNeedsPlacement(false);
          savePose(next).finally(() => setPlacing(false));
        }}
      />
    );

    // Mount a transient monitor element at the document root while placing
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = (await import("react-dom/client")).createRoot(host);
    root.render(<Monitor />);

    function cleanup() {
      try {
        root.unmount();
        document.body.removeChild(host);
      } catch {}
      try {
        reticle?.remove?.();
      } catch {}
      try {
        hit?.stop?.();
      } catch {}
      stop = () => {};
    }

    stop = cleanup;
  }

  // Kick placement automatically if there’s no pose
  useEffect(() => {
    if (isSpatial && needsPlacement && !placing) {
      startPlacement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpatial, needsPlacement]);

  return (
    <WS.XRApp>
      {/* Transparent window scene */}
      <WS.SpatialView
        config={{
          transparent: true,
          // optional: rounded corners/material controlled by manifest too
        }}
        className={`wall-view ${placing ? "placing" : ""}`}
      >
        {/* Toast */}
        {isSpatial && needsPlacement && (
          <div className="placement-toast">Tap to place wall</div>
        )}

        {/* Dev-only reset */}
        {isSpatial && (dev ?? import.meta.env.DEV) && (
          <button
            className="reset-placement"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              // Clear saved pose and re-enter placement
              await supabase
                .from("walls")
                .update({
                  pose_position: null,
                  pose_rotation: null,
                  pose_scale: null,
                })
                .eq("id", wallId);
              setPose(null);
              setNeedsPlacement(true);
              startPlacement();
            }}
          >
            Reset Placement
          </button>
        )}

        {/* Only render the wall once we have a pose */}
        {pose ? (
          <WS.SpatialDiv
            position={pose.position}
            rotation={pose.rotation}
            scale={pose.scale}
            // Optional: give the panel a subtle “glass” look in spatial mode
            style={{
              // You can still use your existing .wall-view CSS inside
              width: "1.6m", // perceived size
            }}
          >
            {children}
          </WS.SpatialDiv>
        ) : null}
      </WS.SpatialView>
    </WS.XRApp>
  );
}
