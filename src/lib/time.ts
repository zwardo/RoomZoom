/** Client-side helpers. All values are in the viewer's local time zone. */

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromInputs(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

/** Next half hour from now, e.g. 10:07 -> 10:30. */
export function nextHalfHour(now = new Date()) {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  return d;
}

/** Local 7:00-19:00 on the given day, widened to include the window if needed. */
export function dayWindow(start: Date, end: Date) {
  const dayStart = new Date(start);
  dayStart.setHours(Math.min(7, start.getHours()), 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(19, 0, 0, 0);
  if (end > dayEnd) dayEnd.setTime(end.getTime());
  return { dayStart, dayEnd };
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
