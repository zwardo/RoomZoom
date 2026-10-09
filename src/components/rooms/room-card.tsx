import { AlertTriangle, MapPinOff, PhoneCall, Star, Users, Video } from "lucide-react";
import type * as React from "react";
import { LocationMeta } from "@/components/rooms/location-meta";
import { IconButton } from "@/components/ui/icon-button";
import { MetaList } from "@/components/ui/meta-list";
import type { MeetingRoom } from "@/lib/calendar/types";
import type { RoomResult } from "@/lib/rooms/types";
import { cn } from "@/lib/utils";

const MEDIA = /video|chromebox|zoom|meet|camera|screen|tv|display|projector|monitor/i;
const PHONE = /phone|audio|speaker/i;

/** Groups free-form room features into the Figma "add. info" slots: media, phone, then the rest. */
export function groupFeatures(features: string[]) {
  const media = features.filter((f) => MEDIA.test(f));
  const phone = features.filter((f) => !MEDIA.test(f) && PHONE.test(f));
  const other = features.filter((f) => !media.includes(f) && !phone.includes(f));
  return { media, phone, other };
}

/** A room from our catalog, or one on a meeting that isn't (another campus, not mapped yet). */
export type CardRoom = RoomResult | MeetingRoom;

export function isCatalogRoom(room: CardRoom): room is RoomResult {
  return "buildingId" in room;
}

export type RoomCardTone = "default" | "selected" | "booked" | "busy";

/** Figma room-card surfaces. Fills are opaque because the card floats over the map. */
export const roomCardTones: Record<RoomCardTone, string> = {
  default: "border-transparent bg-rooms-dark",
  selected: "border-rooms-accent bg-rooms-xdark",
  booked: "border-rooms-accent bg-rooms-accent-tint-20",
  busy: "border-rooms-warn bg-rooms-xdark",
};

function Info({ icon: Icon, children }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <>
      {Icon && <Icon className="size-5 shrink-0 text-rooms-light" aria-hidden />}
      {children}
    </>
  );
}

/**
 * Figma "building + floor" and "add. info" rows. Rooms outside the catalog
 * can't be placed on the map, so they say so instead.
 */
export function RoomDetails({ room, needed }: { room: CardRoom; needed?: number }) {
  if (!isCatalogRoom(room)) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-rooms-xpale">
        <MapPinOff className="size-5 shrink-0 text-rooms-light" aria-hidden />
        Not on your campus map
      </p>
    );
  }
  const tooSmall = needed != null && room.capacity != null && room.capacity < needed;
  const { media, phone, other } = groupFeatures(room.features);
  return (
    <>
      <LocationMeta location={room} />
      <MetaList
        className="text-xs text-rooms-xpale"
        items={[
          tooSmall ? (
            <span key="cap" className="inline-flex items-center gap-1 text-rooms-warn">
              <AlertTriangle className="size-5 shrink-0" aria-hidden />
              Fits {room.capacity} of {needed}
            </span>
          ) : (
            <Info key="cap" icon={Users}>
              <span>
                {room.capacity ?? "?"}
                <span className="sr-only"> seats</span>
              </span>
            </Info>
          ),
          media.length > 0 && (
            <Info key="media" icon={Video}>
              {media.join(", ")}
            </Info>
          ),
          phone.length > 0 && (
            <Info key="phone" icon={PhoneCall}>
              {phone.join(", ")}
            </Info>
          ),
          other.length > 0 && <Info key="other">{other.join(", ")}</Info>,
        ]}
      />
    </>
  );
}

/**
 * Figma "room-card": name, location and amenities, with `action` (buttons
 * or chips) on the right. `tone` picks the Figma state's outline and fill.
 */
export function RoomCard({
  room,
  tone = "default",
  needed,
  favorite,
  action,
  stacked = false,
  onSelect,
  children,
  className,
}: {
  room: CardRoom;
  tone?: RoomCardTone;
  /** People expected; capacity turns into a warning when the room is smaller. */
  needed?: number;
  /** Shows a star toggle next to the name. */
  favorite?: { on: boolean; onToggle: () => void };
  action?: React.ReactNode;
  /** Puts `action` in a footer row instead of beside the details (for narrow columns). */
  stacked?: boolean;
  onSelect?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const catalog = isCatalogRoom(room);
  return (
    <article
      aria-label={room.name}
      className={cn(
        "relative flex gap-4 overflow-clip rounded-lg border px-4 py-2 transition-colors",
        stacked && "flex-col",
        roomCardTones[tone],
        onSelect && tone === "default" && "hover:border-rooms-light",
        className,
      )}
    >
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={tone !== "default"}
          className="absolute inset-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          <span className="sr-only">Show {room.name} on the map</span>
        </button>
      )}
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white">
          <span className="truncate">{room.name}</span>
          {favorite && (
            <IconButton
              aria-label={favorite.on ? `Remove ${room.name} from favorites` : `Add ${room.name} to favorites`}
              aria-pressed={favorite.on}
              onClick={favorite.onToggle}
              className="pointer-events-auto relative text-rooms-xlight aria-pressed:border-transparent aria-pressed:bg-transparent aria-pressed:text-rooms-accent"
            >
              <Star className={cn(favorite.on && "fill-current")} />
            </IconButton>
          )}
          {catalog && room.available === null && <span className="text-xs font-normal text-rooms-xlight">availability unknown</span>}
        </h3>
        <RoomDetails room={room} needed={needed} />
        {children}
      </div>
      {action && (
        <div className={cn("relative flex shrink-0 items-center gap-4", stacked ? "justify-end" : "self-start pt-1.5")}>{action}</div>
      )}
    </article>
  );
}
