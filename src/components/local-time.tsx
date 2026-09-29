"use client";

const formats = {
  time: { hour: "numeric", minute: "2-digit" },
  day: { weekday: "long", month: "short", day: "numeric" },
  datetime: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** Formats in the viewer's time zone rather than the server's. */
export function LocalTime({ iso, format = "time" }: { iso: string; format?: keyof typeof formats }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Date(iso).toLocaleString(undefined, formats[format])}
    </time>
  );
}

/** "3:30 – 4:30 PM", sharing the day period when both ends fall in it. */
export function LocalTimeRange({ start, end }: { start: string; end: string }) {
  const fmt = new Intl.DateTimeFormat(undefined, formats.time);
  return (
    <time dateTime={`${start}/${end}`} suppressHydrationWarning>
      {fmt.formatRange(new Date(start), new Date(end))}
    </time>
  );
}

/** "Today (10/16)", "Tomorrow (10/17)" or "Saturday (10/18)". */
export function LocalDayLabel({ iso }: { iso: string }) {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const name =
    date.toDateString() === today.toDateString()
      ? "Today"
      : date.toDateString() === tomorrow.toDateString()
        ? "Tomorrow"
        : date.toLocaleDateString(undefined, { weekday: "long" });
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {name} ({date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })})
    </time>
  );
}
