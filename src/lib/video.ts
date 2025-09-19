// src/lib/video.ts
export type VideoKind = "mp4" | "youtube" | "vimeo" | "unknown";

export function detectVideoKind(url: string): VideoKind {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return "mp4";
    if (host.includes("youtube.com") || host.includes("youtu.be"))
      return "youtube";
    if (host.includes("vimeo.com")) return "vimeo";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// video.ts
// src/lib/video.ts
// src/lib/video.ts
export function toYouTubeEmbedBase(
  id: string,
  { autoplay }: { autoplay: 0 | 1 }
) {
  const origin = encodeURIComponent(window.location.origin);
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay}&mute=1&playsinline=1&rel=0&modestbranding=1&controls=1&origin=${origin}`;
}

// src/lib/video.ts
// src/lib/video.ts
export function toYouTubeEmbed(url: string, opts?: { autoplay?: 0 | 1 }) {
  const u = new URL(url);
  let id = "";
  if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
  else id = u.searchParams.get("v") ?? "";
  const autoplay = opts?.autoplay ?? 0;
  return id
    ? `https://www.youtube.com/embed/${id}?autoplay=${autoplay}&playsinline=1&mute=0&rel=0&modestbranding=1&fs=0`
    : "";
}

export function toVimeoEmbed(url: string, opts?: { autoplay?: 0 | 1 }) {
  const u = new URL(url);
  const id = u.pathname.split("/").filter(Boolean).pop() ?? "";
  const autoplay = opts?.autoplay ?? 0;
  return id
    ? `https://player.vimeo.com/video/${id}?autoplay=${autoplay}&muted=0&portrait=0&title=0&byline=0`
    : "";
}
