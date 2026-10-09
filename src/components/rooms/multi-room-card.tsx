"use client";

import { useId, useRef } from "react";
import { type CardRoom, RoomDetails, roomCardTones } from "@/components/rooms/room-card";
import { cn } from "@/lib/utils";

/**
 * Figma "multi-room card": one tab per room on a meeting above the booked
 * room-card body for the active one. Arrow keys move between tabs.
 */
export function MultiRoomCard({
  rooms,
  activeEmail,
  onActivate,
  needed,
  action,
  className,
}: {
  rooms: CardRoom[];
  activeEmail: string;
  onActivate: (room: CardRoom) => void;
  needed?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, rooms.findIndex((r) => r.email.toLowerCase() === activeEmail.toLowerCase()));
  const active = rooms[activeIndex];

  function onKeyDown(e: React.KeyboardEvent) {
    const targets: Record<string, number> = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: rooms.length - 1 };
    if (!(e.key in targets)) return;
    e.preventDefault();
    const next = (targets[e.key] + rooms.length) % rooms.length;
    onActivate(rooms[next]);
    tabs.current[next]?.focus();
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div role="tablist" aria-label="Rooms on this meeting" className="flex max-w-full overflow-x-auto" onKeyDown={onKeyDown}>
        {rooms.map((room, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={room.email}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onActivate(room)}
              className={cn(
                "shrink-0 rounded-t-lg border-x border-t border-rooms-accent px-4 py-1 text-base font-semibold whitespace-nowrap text-white transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                selected ? "bg-rooms-accent-tint-30" : "bg-rooms-xdark hover:bg-rooms-accent-tint-20",
              )}
            >
              {room.name}
            </button>
          );
        })}
      </div>
      <article
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${activeIndex}`}
        className={cn("flex gap-4 rounded-tr-lg rounded-b-lg border px-4 py-2", roomCardTones.booked)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <RoomDetails room={active} needed={needed} />
        </div>
        {action && <div className="flex shrink-0 items-center gap-4 self-center">{action}</div>}
      </article>
    </div>
  );
}
