import type { BusyInterval } from "@/lib/calendar/types";

/** A compact bar showing the room's busy blocks across the day and the requested slot. */
export function AvailabilityTimeline({
  busy,
  dayStart,
  dayEnd,
  start,
  end,
}: {
  busy: BusyInterval[];
  dayStart: string;
  dayEnd: string;
  start: string;
  end: string;
}) {
  const from = Date.parse(dayStart);
  const span = Date.parse(dayEnd) - from;
  const pos = (iso: string) => Math.min(100, Math.max(0, ((Date.parse(iso) - from) / span) * 100));
  const width = (s: string, e: string) => Math.max(0.5, pos(e) - pos(s));

  const hours: number[] = [];
  for (let t = Math.ceil(from / 3_600_000) * 3_600_000; t < from + span; t += 3_600_000) hours.push(t);

  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-sm bg-rooms-accent/20"
      role="img"
      aria-label={`${busy.length} existing bookings today`}
    >
      {hours.map((t) => (
        <span key={t} className="absolute inset-y-0 w-px bg-card/80" style={{ left: `${((t - from) / span) * 100}%` }} />
      ))}
      {busy.map((b) => (
        <span
          key={b.start}
          className="absolute inset-y-0 bg-map-busy"
          style={{ left: `${pos(b.start)}%`, width: `${width(b.start, b.end)}%` }}
        />
      ))}
      <span
        className="absolute inset-y-0 rounded-sm border-2 border-primary"
        style={{ left: `${pos(start)}%`, width: `${width(start, end)}%` }}
      />
    </div>
  );
}
