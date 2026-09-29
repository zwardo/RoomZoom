import { redirect } from "next/navigation";

/** Finding a room now happens on the home screen; keep old links (with ?eventId=) working. */
export default async function FindPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { eventId } = await searchParams;
  redirect(eventId ? `/?${new URLSearchParams({ meeting: eventId })}` : "/");
}
