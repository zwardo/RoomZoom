import type { CurrentUser } from "@/lib/session";
import { DemoCalendarProvider } from "./demo";
import { GoogleCalendarProvider } from "./google";
import type { CalendarProvider } from "./types";

export async function getCalendar(user: CurrentUser): Promise<CalendarProvider> {
  return user.provider === "google"
    ? GoogleCalendarProvider.forUser(user.email)
    : new DemoCalendarProvider(user.email);
}

export * from "./types";
