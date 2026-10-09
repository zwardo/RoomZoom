import { z } from "zod";
import { getCalendar, overlaps } from "@/lib/calendar";
import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/session";

const bookingSchema = z
  .object({
    roomId: z.string().min(1),
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
    /** Present when adding the room to an existing meeting. */
    eventId: z.string().min(1).optional(),
    /** Rooms on the meeting that the new room replaces. */
    replaceEmails: z.array(z.email()).max(20).optional(),
    title: z.string().trim().max(200).optional(),
    guests: z.array(z.email()).max(50).optional(),
  })
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), { message: "End must be after start" })
  .refine((v) => Date.parse(v.end) > Date.now(), { message: "That time has already passed" });

const removalSchema = z.object({
  eventId: z.string().min(1),
  roomEmail: z.email(),
});

export const POST = apiHandler(async (req, user) => {
  const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid booking");
  const input = parsed.data;

  const room = await db.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new HttpError(404, "Room not found");

  const calendar = await getCalendar(user);
  const existing = input.eventId ? await calendar.getMeeting(input.eventId) : null;
  if (input.eventId && !existing) throw new HttpError(404, "Meeting not found");
  // For an existing meeting, the event's own times win over whatever the client sent.
  const start = existing?.start ?? input.start;
  const end = existing?.end ?? input.end;

  // Availability can change between search and booking, so check again.
  const alreadyOnEvent = existing?.rooms.some((r) => r.email === room.resourceEmail);
  if (!alreadyOnEvent) {
    const fb = (await calendar.freeBusy([room.resourceEmail], start, end))[room.resourceEmail];
    if (fb && !fb.error && overlaps(fb.busy, start, end)) {
      throw new HttpError(409, `${room.name} was just booked by someone else. Pick another room.`);
    }
  }

  const meeting = existing
    ? await calendar.addRoomToMeeting({
        eventId: existing.id,
        roomEmail: room.resourceEmail,
        roomName: room.name,
        replaceEmails: input.replaceEmails,
      })
    : await calendar.createMeeting({
        title: input.title || "Meeting",
        start,
        end,
        roomEmail: room.resourceEmail,
        roomName: room.name,
        guests: input.guests,
      });

  const status = meeting.rooms.find((r) => r.email === room.resourceEmail)?.status;
  const message =
    status === "accepted"
      ? `${room.name} is booked for "${meeting.title}".`
      : `${room.name} was invited to "${meeting.title}". Google confirms room bookings within a few seconds; the status shows on My meetings.`;
  return Response.json({ meeting, message }, { status: existing ? 200 : 201 });
});

/** Takes a room off a meeting. Off-campus rooms aren't in the catalog, so they're addressed by email. */
export const DELETE = apiHandler(async (req, user) => {
  const parsed = removalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const input = parsed.data;

  const calendar = await getCalendar(user);
  const existing = await calendar.getMeeting(input.eventId);
  if (!existing) throw new HttpError(404, "Meeting not found");
  const room = existing.rooms.find((r) => r.email.toLowerCase() === input.roomEmail.toLowerCase());
  if (!room) throw new HttpError(404, "That room isn't on this meeting");

  const meeting = await calendar.removeRoomFromMeeting({ eventId: existing.id, roomEmail: room.email });
  return Response.json({ meeting, message: `${room.name} was removed from "${meeting.title}".` });
});
