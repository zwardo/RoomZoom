"use client";

import { useEffect } from "react";

/** How long a scrollbar stays visible after the last scroll, like macOS overlay scrollbars. */
const VISIBLE_MS = 1000;

/**
 * Flags whatever is scrolling with `data-scrolling` until it's been still for
 * a moment, so `scrollbar-auto-hide` areas show their scrollbar while scrolling
 * without the pointer over them (keyboard, or the Rooms grid scrolling the
 * meetings list along with it).
 */
export function ScrollActivity() {
  useEffect(() => {
    const timers = new Map<Element, number>();
    const onScroll = (e: Event) => {
      const el = e.target instanceof Element ? e.target : document.documentElement;
      el.setAttribute("data-scrolling", "");
      window.clearTimeout(timers.get(el));
      timers.set(
        el,
        window.setTimeout(() => {
          el.removeAttribute("data-scrolling");
          timers.delete(el);
        }, VISIBLE_MS),
      );
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      for (const [el, timer] of timers) {
        window.clearTimeout(timer);
        el.removeAttribute("data-scrolling");
      }
    };
  }, []);
  return null;
}
