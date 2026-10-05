"use client";

import { useEffect, useState } from "react";

export interface RowBox {
  top: number;
  height: number;
}

export type RowAlignment =
  /** The panels are stacked (narrow screens), so there's nothing beside the grid to line up with. */
  | { mode: "stacked" }
  | {
      mode: "aligned";
      /** Meeting id → its row's box in the grid's content, level with the meeting's card. */
      rows: Map<string, RowBox>;
      /** Stretches of empty days, filled like the Figma "spacer". */
      gaps: RowBox[];
      /** Content height that gives the grid the same scroll range as the meetings list. */
      height: number;
    };

const ROWS = "[data-meeting-row],[data-empty-row]";
/** The meetings list's gap between cards (gap-4). */
const ROW_GAP = 16;

function measure(source: HTMLElement, target: HTMLElement): RowAlignment {
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (s.right > t.left) return { mode: "stacked" };

  // A card's top in the grid's content once both panels share a scrollTop.
  const shift = source.scrollTop - t.top;
  const rows = new Map<string, RowBox>();
  const gaps: RowBox[] = [];
  let bottom = 0;
  let prevBottom: number | null = null;
  // The run of empty days since the last meeting, if any.
  let emptyTop: number | null = null;
  let emptyBottom = 0;
  for (const el of source.querySelectorAll<HTMLElement>(ROWS)) {
    const r = el.getBoundingClientRect();
    const box = { top: r.top + shift, height: r.height };
    bottom = Math.max(bottom, box.top + box.height);
    const id = el.dataset.meetingRow;
    if (id === undefined) {
      emptyTop ??= prevBottom != null ? prevBottom + ROW_GAP : box.top;
      emptyBottom = box.top + box.height;
      continue;
    }
    if (emptyTop != null) gaps.push({ top: emptyTop, height: box.top - ROW_GAP - emptyTop });
    emptyTop = null;
    rows.set(id, box);
    prevBottom = box.top + box.height;
  }
  if (emptyTop != null) gaps.push({ top: emptyTop, height: emptyBottom - emptyTop });

  const height = Math.max(source.scrollHeight - source.clientHeight + target.clientHeight, bottom + ROW_GAP);
  return { mode: "aligned", rows, gaps, height: Math.round(height) };
}

function signature(a: RowAlignment | null) {
  if (!a || a.mode === "stacked") return a?.mode ?? "";
  const rows = [...a.rows].map(([id, r]) => `${id}:${Math.round(r.top)}:${Math.round(r.height)}`);
  const gaps = a.gaps.map((g) => `${Math.round(g.top)}:${Math.round(g.height)}`);
  return `${a.height}|${rows.join(",")}|${gaps.join(",")}`;
}

/**
 * Lines the grid's rows up with the `[data-meeting-row]` cards in the meetings
 * list (`source`) and scrolls the two together, so each row sits beside its
 * meeting. Returns null until the first measurement.
 */
export function useRowAlignment(source: HTMLElement | null, target: HTMLElement | null): RowAlignment | null {
  const [alignment, setAlignment] = useState<RowAlignment | null>(null);

  useEffect(() => {
    if (!source || !target) return;
    let frame = 0;
    const update = () => {
      const next = measure(source, target);
      setAlignment((prev) => (signature(prev) === signature(next) ? prev : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    // Card heights change with text wrapping and data, which doesn't resize the scroll container itself.
    const resize = new ResizeObserver(schedule);
    const observe = () => {
      resize.disconnect();
      resize.observe(source);
      resize.observe(target);
      source.querySelectorAll(ROWS).forEach((el) => resize.observe(el));
    };
    const mutation = new MutationObserver(() => {
      observe();
      schedule();
    });
    mutation.observe(source, { childList: true, subtree: true });
    observe();
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
    };
  }, [source, target]);

  const aligned = alignment?.mode === "aligned";
  const height = aligned ? alignment.height : 0;
  useEffect(() => {
    if (!source || !target || !aligned) return;
    // Scroll events arrive a frame late, so remember what we set to tell our own echoes from the user scrolling.
    const expected = new Map<HTMLElement, number>();
    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      if (expected.get(from) === from.scrollTop) {
        expected.delete(from);
        return;
      }
      if (Math.abs(to.scrollTop - from.scrollTop) < 1) return;
      to.scrollTop = from.scrollTop;
      expected.set(to, to.scrollTop);
    };
    const toTarget = follow(source, target);
    const toSource = follow(target, source);
    toTarget();
    source.addEventListener("scroll", toTarget, { passive: true });
    target.addEventListener("scroll", toSource, { passive: true });
    return () => {
      source.removeEventListener("scroll", toTarget);
      target.removeEventListener("scroll", toSource);
    };
  }, [source, target, aligned, height]);

  return alignment;
}
