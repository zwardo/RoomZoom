"use client";

import { useSyncExternalStore } from "react";

/**
 * The meeting whose Rooms tab row is under the pointer. It lives outside React
 * state so a hover re-renders only what reads it, not the whole screen.
 */
export interface HoveredMeeting {
  get: () => string | null;
  set: (meetingId: string | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createHoveredMeeting(): HoveredMeeting {
  let current: string | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (meetingId) => {
      if (meetingId === current) return;
      current = meetingId;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const subscribeNoop = () => () => {};

export function useHoveredMeetingId(store: HoveredMeeting | undefined): string | null {
  return useSyncExternalStore(store?.subscribe ?? subscribeNoop, () => store?.get() ?? null, () => null);
}

/** Whether `meetingId` is hovered, re-rendering only when that changes. */
export function useIsMeetingHovered(store: HoveredMeeting | undefined, meetingId: string): boolean {
  return useSyncExternalStore(store?.subscribe ?? subscribeNoop, () => store?.get() === meetingId, () => false);
}
