"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoomPriority, SearchResponse } from "@/lib/rooms/types";
import { dayWindow } from "@/lib/time";

export interface RoomFilters {
  minCapacity: number;
  buildingId: string;
  floorId: string;
  features: string[];
  availableOnly: boolean;
  /** A standing preference rather than a filter: kept across resets and remembered per browser. */
  priority: RoomPriority;
}

export const DEFAULT_FILTERS: RoomFilters = {
  minCapacity: 1,
  buildingId: "",
  floorId: "",
  features: [],
  availableOnly: false,
  priority: "nearest",
};

export interface SearchContext {
  /** Room emails returned even when the filters would hide them (the meeting's current rooms). */
  include: string[];
  /** Measure distances from this room instead of the desk (back-to-back meetings). */
  fromRoomId: string | null;
  /** Also return favorite and recent rooms. */
  personal: boolean;
  /** Meeting windows to report each room's availability for. */
  cover: { id: string; start: string; end: string }[];
}

/** Fetches /api/rooms/search for a time slot; `reloadKey` forces a refetch (e.g. after booking). */
export function useRoomSearch(slot: { start: Date; end: Date }, filters: RoomFilters, context: SearchContext, reloadKey: number) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settledQuery, setSettledQuery] = useState<string | null>(null);

  const startMs = slot.start.getTime();
  const endMs = slot.end.getTime();
  const includeKey = context.include.join(",");
  const { fromRoomId, personal } = context;
  const coverKey = context.cover.map((w) => `${w.id}~${w.start}~${w.end}`).join(",");
  const valid = !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs;

  const query = useMemo(() => {
    if (!valid) return null;
    const start = new Date(startMs);
    const end = new Date(endMs);
    const day = dayWindow(start, end);
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      dayStart: day.dayStart.toISOString(),
      dayEnd: day.dayEnd.toISOString(),
      minCapacity: String(filters.minCapacity),
      priority: filters.priority,
    });
    if (filters.buildingId) params.set("buildingId", filters.buildingId);
    if (filters.floorId) params.set("floorId", filters.floorId);
    if (filters.features.length) params.set("features", filters.features.join(","));
    if (filters.availableOnly) params.set("availableOnly", "1");
    if (includeKey) params.set("include", includeKey);
    if (fromRoomId) params.set("fromRoomId", fromRoomId);
    if (personal) params.set("personal", "1");
    if (coverKey) params.set("cover", coverKey);
    return params.toString();
  }, [valid, startMs, endMs, filters, includeKey, fromRoomId, personal, coverKey]);

  const requestKey = query ? `${query}#${reloadKey}` : null;

  useEffect(() => {
    if (!query || !requestKey) return;
    const controller = new AbortController();
    fetch(`/api/rooms/search?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Search failed");
        setData(body as SearchResponse);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Search failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledQuery(requestKey);
      });
    return () => controller.abort();
  }, [query, requestKey]);

  return { data, error, loading: requestKey !== null && settledQuery !== requestKey };
}
