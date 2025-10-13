import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import DeleteAccountButton from "./DeleteAccountButton";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 220 });

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dlgRef = useRef<HTMLDialogElement | null>(null);

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const minWidth = 220;
    setPos({
      top: Math.round(b.bottom + 8),
      left: Math.round(b.right - minWidth), // right-align to button
      minWidth,
    });
  }, []);

  // open/close (NON-modal) and position
  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;

    if (open) {
      if (!dlg.open) dlg.show(); // non-modal
      dlg.style.position = "fixed";
      dlg.style.margin = "0";
      (dlg.style as any).inset = "auto";
      dlg.style.top = `${pos.top}px`;
      dlg.style.left = `${pos.left}px`;
      dlg.style.minWidth = `${pos.minWidth}px`;
      dlg.style.zIndex = "10000";

      // ✅ keep focus off the first menu item
      dlg.tabIndex = -1;
      dlg.focus({ preventScroll: true });
    } else if (dlg.open) {
      dlg.close();
    }
  }, [open, pos]);

  // keep anchored on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      place();
      const dlg = dlgRef.current;
      if (!dlg) return;
      dlg.style.top = `${pos.top}px`;
      dlg.style.left = `${pos.left}px`;
      dlg.style.minWidth = `${pos.minWidth}px`;
    };
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open, pos, place]);

  // close on outside click (CAPTURE) + Esc
  useEffect(() => {
    if (!open) return;

    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (dlgRef.current?.contains(t)) return; // inside menu
      if (btnRef.current?.contains(t)) return; // on the button
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    // capture phase is critical so backdrop/other layers don't swallow it
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // prevent inside clicks from bubbling to the doc capture listener
  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    const stop = (e: Event) => e.stopPropagation();
    dlg.addEventListener("pointerdown", stop);
    return () => dlg.removeEventListener("pointerdown", stop);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.hash = "/auth";
  };

  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={(e) => {
          e.stopPropagation(); // avoid the capture listener
          place();
          setOpen((v) => !v); // toggle (clicking ellipsis closes)
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <circle cx="5" cy="12" r="2"></circle>
          <circle cx="12" cy="12" r="2"></circle>
          <circle cx="19" cy="12" r="2"></circle>
        </svg>
      </button>

      <dialog
        ref={dlgRef}
        className="title-menu title-menu--dialog account-menu"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          minWidth: pos.minWidth,
        }}
      >
        <div role="menu" className="menu-list" aria-label="Account">
          <button role="menuitem" className="title-menu-item" onClick={signOut}>
            Sign out
          </button>
          <div className="title-menu-sep" />
          <DeleteAccountButton className="danger-row" />
        </div>
      </dialog>
    </>
  );
}
