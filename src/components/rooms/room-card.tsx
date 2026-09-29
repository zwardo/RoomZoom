import { AlertTriangle, PhoneCall, Star, Users, Video, XCircle } from "lucide-react";
import type * as React from "react";
import { LocationMeta } from "@/components/rooms/location-meta";
import { IconButton } from "@/components/ui/icon-button";
import { MetaList } from "@/components/ui/meta-list";
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

function Info({ icon: Icon, children }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <>
      {Icon && <Icon className="size-5 shrink-0 text-rooms-light" aria-hidden />}
      {children}
    </>
  );
}

/**
 * Figma "room-card". Selected rooms get the accent outline; busy rooms are
 * dimmed on the Dark surface with a warn x-circle. `action` renders top-right
 * (e.g. the "Book room" button).
 */
export function RoomCard({
  room,
  selected = false,
  needed,
  favorite,
  action,
  stacked = false,
  onSelect,
  children,
  className,
}: {
  room: RoomResult;
  selected?: boolean;
  /** People expected; capacity turns into a warning when the room is smaller. */
  needed?: number;
  /** Shows a star toggle next to the name. */
  favorite?: { on: boolean; onToggle: () => void };
  action?: React.ReactNode;
  /** Puts `action` in a footer row instead of the top-right corner (for narrow columns). */
  stacked?: boolean;
  onSelect?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const busy = room.available === false;
  const tooSmall = needed != null && room.capacity != null && room.capacity < needed;
  const { media, phone, other } = groupFeatures(room.features);
  return (
    <article
      aria-label={room.name}
      className={cn(
        "relative flex flex-col gap-2 overflow-clip rounded-lg border px-4 py-3 transition-colors",
        selected ? "border-rooms-accent bg-rooms-xdark" : "border-transparent bg-rooms-dark",
        busy && !selected && "opacity-75",
        onSelect && !selected && "hover:border-rooms-light",
        className,
      )}
    >
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="absolute inset-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          <span className="sr-only">Show {room.name} on the map</span>
        </button>
      )}
      <div className={cn("pointer-events-none flex min-w-0 flex-col gap-2", action && !stacked && "pr-32")}>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
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
          {busy && (
            <>
              <XCircle className="size-5 shrink-0 text-rooms-warn" aria-hidden />
              <span className="sr-only">(busy)</span>
            </>
          )}
          {room.available === null && <span className="text-xs font-normal text-rooms-xlight">availability unknown</span>}
        </h3>
        <LocationMeta className="text-sm" location={room} />
        <MetaList
          className="text-sm text-rooms-xpale"
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
        {children}
      </div>
      {action && (stacked ? <div className="relative flex justify-end">{action}</div> : <div className="absolute top-3.5 right-3.5">{action}</div>)}
    </article>
  );
}
