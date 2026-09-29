import { z } from "zod";
import { getCalendar } from "@/lib/calendar";
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
