import { z } from "zod";
import { getCalendar, overlaps } from "@/lib/calendar";
import { isSupportedRule } from "@/lib/calendar/recurrence";
import { db } from "@/lib/db";
import { getDistanceResolver } from "@/lib/geo/resolver";
import { loadMeetings } from "@/lib/meetings/load";
import { apiHandler, HttpError } from "@/lib/session";

const schema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  })
  .refine((v) => Date.parse(v.to) > Date.parse(v.from), { message: "`to` must be after `from`" })
  .refine((v) => Date.parse(v.to) - Date.parse(v.from) <= 31 * 86_400_000, { message: "Ranges are limited to 31 days" });

export const GET = apiHandler(async (req, user) => {
  const parsed = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid range");

  const [calendar, distance] = await Promise.all([getCalendar(user), getDistanceResolver(user.email)]);
  const meetings = await loadMeetings(calendar, distance, parsed.data.from, parsed.data.to);
  return Response.json({ meetings });
});

function isTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });

const createSchema = z
  .object({
    title: z.string().trim().max(200),
    allDay: z.boolean().default(false),
    /** A date-time, or a `YYYY-MM-DD` date for all-day meetings. */
    start: z.string(),
    /** A date-time, or the exclusive end date for all-day meetings. */
    end: z.string(),
    timeZone: z.string().max(64).refine(isTimeZone, { message: "Unknown time zone" }).optional(),
    recurrence: z.string().refine(isSupportedRule, { message: "Unsupported repeat" }).optional(),
    roomId: z.string().min(1).optional(),
    location: z.string().trim().max(500).optional(),
    guests: z.array(z.email()).max(50).default([]),
    description: z.string().max(8000).optional(),
    addMeet: z.boolean().default(false),
    reminders: z
      .array(z.object({ method: z.enum(["popup", "email"]), minutes: z.number().int().min(0).max(40_320) }))
      .max(5)
      .optional(),
    showAs: z.enum(["busy", "free"]).default("busy"),
    visibility: z.enum(["default", "public", "private"]).default("default"),
    guestPermissions: z.object({ modify: z.boolean(), inviteOthers: z.boolean(), seeGuestList: z.boolean() }).optional(),
  })
  .superRefine((v, ctx) => {
    const format = v.allDay ? isoDate : isoDateTime;
    if (!format.safeParse(v.start).success || !format.safeParse(v.end).success) {
      ctx.addIssue({ code: "custom", message: v.allDay ? "All-day meetings need dates" : "Invalid start or end time" });
      return;
    }
    // ISO dates compare correctly as strings; date-times need parsing for their offsets.
    const after = v.allDay ? v.end > v.start : Date.parse(v.end) > Date.parse(v.start);
    if (!after) ctx.addIssue({ code: "custom", message: "End must be after start" });
    else if (!v.allDay && Date.parse(v.end) <= Date.now()) ctx.addIssue({ code: "custom", message: "That time has already passed" });
    if (v.allDay && v.roomId) ctx.addIssue({ code: "custom", message: "Rooms can only be booked for timed meetings" });
  });

export const POST = apiHandler(async (req, user) => {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid meeting");
  const { roomId, ...input } = parsed.data;

  const room = roomId ? await db.room.findUnique({ where: { id: roomId } }) : null;
  if (roomId && !room) throw new HttpError(404, "Room not found");

  const calendar = await getCalendar(user);
  // Availability can change after the dialog loaded it. For repeats this checks the first occurrence;
  // the room declines any later ones it can't make.
  if (room) {
    const fb = (await calendar.freeBusy([room.resourceEmail], input.start, input.end))[room.resourceEmail];
    if (fb && !fb.error && overlaps(fb.busy, input.start, input.end)) {
      throw new HttpError(409, `${room.name} was just booked by someone else. Pick another room.`);
    }
  }

  const meeting = await calendar.createMeeting({
    ...input,
    title: input.title || "(No title)",
    location: room ? undefined : input.location || undefined,
    roomEmail: room?.resourceEmail,
    roomName: room?.name,
  });

  const status = room && meeting.rooms.find((r) => r.email === room.resourceEmail)?.status;
  const message = !room
    ? `Created "${meeting.title}".`
    : status === "accepted"
      ? `Created "${meeting.title}" in ${room.name}.`
      : `Created "${meeting.title}" and invited ${room.name}. Google confirms room bookings within a few seconds.`;
  return Response.json({ meeting, message }, { status: 201 });
});
