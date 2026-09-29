import { RoomFinder } from "@/components/find/room-finder";
import { requireUser, toHeaderUser } from "@/lib/session";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  return <RoomFinder user={toHeaderUser(user)!} initialMeetingId={params.meeting ?? params.eventId ?? null} />;
}
