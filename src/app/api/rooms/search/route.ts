import { getCalendar } from "@/lib/calendar";
import { getDistanceResolver } from "@/lib/geo/resolver";
import { loadPersonalRooms } from "@/lib/rooms/personal";
import { searchParamsSchema, searchRooms } from "@/lib/rooms/search";
import { apiHandler, HttpError } from "@/lib/session";

export const GET = apiHandler(async (req, user) => {
  const url = new URL(req.url);
  const parsed = searchParamsSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid search");

  const [calendar, distance] = await Promise.all([
    getCalendar(user),
    getDistanceResolver(user.email, { fromRoomId: parsed.data.fromRoomId }),
  ]);
  const personal = parsed.data.personal ? await loadPersonalRooms(user.email, calendar) : null;
  return Response.json(await searchRooms(parsed.data, calendar, distance, personal));
});
