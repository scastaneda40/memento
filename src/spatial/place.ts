import { getSpatialOrWait } from "./boot";

export type Pose = {
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: number;
};

// Keep ONE panel instance for this page
let _panel: any | null = null;
let _panelDom: HTMLElement | null = null;
let _lastPose: Pose | null = null;

// Pose change subscription for native bar drags
let _onPoseChanged: ((p: Pose) => void) | null = null;
export function onSystemPoseChanged(fn: ((p: Pose) => void) | null) {
  _onPoseChanged = fn;
}

function coercePoseLike(position: any, rotation: any, scale: any): Pose | null {
  const pos = Array.isArray(position)
    ? position
    : position?.toArray?.() ?? null;
  const rot = Array.isArray(rotation)
    ? rotation
    : rotation?.toArray?.() ?? null;
  const scl = typeof scale === "number" ? scale : scale?.value ?? scale ?? 1;
  if (!pos || !rot) return null;
  return {
    position: pos as [number, number, number],
    rotation: rot as [number, number, number, number],
    scale: scl,
  };
}

function hookPanelPoseEvents(panel: any) {
  if (!panel || (panel as any).__poseHooked) return;
  const notify = (p: Pose) => {
    _lastPose = p;
    _onPoseChanged?.(p);
  };

  // Common patterns across SDK builds:
  if (typeof panel.onTransformChanged === "function") {
    panel.onTransformChanged((position: any, rotation: any, scale: any) => {
      const p = coercePoseLike(position, rotation, scale);
      if (p) notify(p);
    });
    (panel as any).__poseHooked = true;
    return;
  }

  if (typeof panel.onPoseChanged === "function") {
    panel.onPoseChanged((pose: any) => {
      const p = coercePoseLike(pose?.position, pose?.rotation, pose?.scale);
      if (p) notify(p);
    });
    (panel as any).__poseHooked = true;
    return;
  }

  if (typeof panel.addEventListener === "function") {
    const handler = (e: any) => {
      // Assume e.detail or e.target carries pose-ish data
      const src = e?.detail ?? e?.target ?? {};
      const p = coercePoseLike(src.position, src.rotation, src.scale);
      if (p) notify(p);
    };
    panel.addEventListener("transformchanged", handler);
    panel.addEventListener("posechanged", handler);
    (panel as any).__poseHooked = true;
    return;
  }

  // If none exist, we just won't get callbacks (safe no-op)
}

async function ensurePanel(wallDom: HTMLElement) {
  const s = await getSpatialOrWait(8000);
  if (!s) return null;
  const { stage } = s;

  // Reuse if already bound to the same DOM
  if (_panel && _panelDom === wallDom) return _panel;

  // Remove previous if bound elsewhere
  if (_panel && _panelDom !== wallDom) {
    try {
      _panel.remove?.();
    } catch {}
    _panel = null;
    _panelDom = null;
  }

  // Create & bind a fresh panel
  _panel = await stage.createDOMPanel?.({
    dom: wallDom,
    widthMeters: 1.3,
    heightMeters: 0.8,
    pixelWidth: 1600,
    pixelHeight: 980,
    curved: false,
    transparent: true,
    clearColor: [0, 0, 0, 0],
  });

  _panelDom = wallDom;

  // Push last pose immediately to keep it in sync
  if (_panel && _lastPose) {
    tryApplyTransform(_panel, _lastPose);
  }

  // Hook pose-change events so native bar drags persist
  hookPanelPoseEvents(_panel);

  return _panel;
}

/** Tries all known transform methods some SDKs expose. */
function tryApplyTransform(panel: any, pose: Pose) {
  _lastPose = pose; // stash for future panels

  panel?.setTransform?.(pose.position, pose.rotation, pose.scale);
  panel?.setPose?.(pose.position, pose.rotation, pose.scale);
  panel?.updateTransform?.(pose.position, pose.rotation, pose.scale);

  // A few SDKs buffer updates; these are no-ops if unsupported
  panel?.commit?.();
  panel?.flush?.();
}

// Set pose immediately (used by sliders and effects)
export async function setPanelPose(
  wallDom: HTMLElement,
  pose: Pose
): Promise<void> {
  _lastPose = pose; // remember even if panel isn't ready yet
  const panel = await ensurePanel(wallDom);
  if (!panel) return;
  try {
    tryApplyTransform(panel, pose);
  } catch {}
}

// Initial show (singleton)
export async function showWallPanelAndPlaceOnce(
  wallDom: HTMLElement,
  initial?: Pose
): Promise<Pose> {
  const s = await getSpatialOrWait(8000);
  if (!s) {
    return { position: [0, 0, -1.0], rotation: [0, 0, 0, 1], scale: 1 };
  }
  const panel = await ensurePanel(wallDom);
  const pose =
    initial ??
    ({ position: [0, 0, -1.0], rotation: [0, 0, 0, 1], scale: 1 } as Pose);
  try {
    tryApplyTransform(panel!, pose);
  } catch {}
  return pose;
}
