import { db } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiHandler<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const room = await db.room.findUnique({ where: { id }, select: { id: true } });
  if (!room) throw new HttpError(404, "Room not found");
  const key = { userEmail: user.email.toLowerCase(), roomId: id };
  await db.favoriteRoom.upsert({ where: { userEmail_roomId: key }, create: key, update: {} });
  return Response.json({ favorite: true });
});

export const DELETE = apiHandler<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  await db.favoriteRoom.deleteMany({ where: { userEmail: user.email.toLowerCase(), roomId: id } });
  return Response.json({ favorite: false });
});
