// src/spatial/boot.ts
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

type SpatialApp = { ws: any; session: any; stage: any } | null;

let spatialApp: SpatialApp = null;

// ---- readiness promise (await anywhere) ----
let _resolveReady!: (v: SpatialApp) => void;
export const spatialReady: Promise<SpatialApp> = new Promise((res) => {
  _resolveReady = res;
});

// ---- capability snapshot (filled during init) ----
type Caps = {
  isWebSpatial: boolean;
  hitTest: boolean;
  domPanel: boolean;
  reticle: boolean;
  onSelect: boolean;
  supportsPlacement: boolean;
};
let _caps: Caps = {
  isWebSpatial: false,
  hitTest: false,
  domPanel: false,
  reticle: false,
  onSelect: false,
  supportsPlacement: false,
};

export function getSpatial() {
  return spatialApp;
}

export function getSpatialCaps(): Caps {
  return _caps;
}

// Wait up to N ms for spatial init; returns null on timeout
export async function getSpatialOrWait(timeoutMs = 8000): Promise<SpatialApp> {
  if (spatialApp) return spatialApp;
  return await Promise.race([
    spatialReady,
    new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
  ]);
}

// Idempotent: safe to call multiple times
export async function initSpatialIfAvailable(): Promise<SpatialApp> {
  if (spatialApp) return spatialApp;

  const ws = (window as any).WebSpatial;
  if (!ws) {
    console.warn("[XR] WebSpatial not on window");
    _resolveReady(null);
    _caps = { ..._caps, isWebSpatial: false, supportsPlacement: false };
    return null;
  }

  // Some builds expose a probe
  const supported =
    typeof ws.isSupported === "function" ? await ws.isSupported() : true;
  if (!supported) {
    _resolveReady(null);
    _caps = { ..._caps, isWebSpatial: true, supportsPlacement: false };
    return null;
  }

  if (typeof ws.ready === "function") {
    try {
      await ws.ready();
    } catch {
      // ignore
    }
  }

  document.documentElement.classList.add("is-spatial");

  const session = await ws.requestSession?.({ domOverlay: true });
  const stage = await session?.createStage?.();

  spatialApp = { ws, session, stage };

  // Compute capability snapshot once
  const hitTest = typeof session?.createHitTestSource === "function";
  const domPanel = typeof stage?.createDOMPanel === "function";
  const reticle = typeof stage?.createReticle === "function";
  const onSelect =
    typeof session?.onSelect === "function" ||
    typeof (session as any)?.onPrimaryAction === "function";

  _caps = {
    isWebSpatial: true,
    hitTest,
    domPanel,
    reticle,
    onSelect,
    supportsPlacement: hitTest && domPanel && reticle && onSelect,
  };

  _resolveReady(spatialApp);
  return spatialApp;
}
