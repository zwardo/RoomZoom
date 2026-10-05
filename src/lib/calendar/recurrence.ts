/**
 * The repeat choices Google Calendar offers by default, as RFC 5545 RRULEs.
 * Rules are built from the start's local date, so build them in the browser.
 */
export const REPEATS = ["none", "daily", "weekly", "monthly", "yearly", "weekdays"] as const;
export type Repeat = (typeof REPEATS)[number];

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const ORDINALS = ["first", "second", "third", "fourth"];
const WEEKDAYS = "MO,TU,WE,TH,FR";

/** 1-4 for the nth weekday of its month, or -1 when it falls in the fifth week ("last"). */
function weekOfMonth(d: Date) {
  const n = Math.ceil(d.getDate() / 7);
  return n > 4 ? -1 : n;
}

export function repeatLabel(repeat: Repeat, start: Date) {
  const weekday = start.toLocaleDateString("en-US", { weekday: "long" });
  switch (repeat) {
    case "none":
      return "Does not repeat";
    case "daily":
      return "Daily";
    case "weekly":
      return `Weekly on ${weekday}`;
    case "monthly": {
      const n = weekOfMonth(start);
      return `Monthly on the ${n === -1 ? "last" : ORDINALS[n - 1]} ${weekday}`;
    }
    case "yearly":
      return `Annually on ${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
    case "weekdays":
      return "Every weekday (Monday to Friday)";
  }
}

export function recurrenceRule(repeat: Repeat, start: Date): string | null {
  const day = BYDAY[start.getDay()];
  switch (repeat) {
    case "none":
      return null;
    case "daily":
      return "RRULE:FREQ=DAILY";
    case "weekly":
      return `RRULE:FREQ=WEEKLY;BYDAY=${day}`;
    case "monthly":
      return `RRULE:FREQ=MONTHLY;BYDAY=${weekOfMonth(start)}${day}`;
    case "yearly":
      return "RRULE:FREQ=YEARLY";
    case "weekdays":
      return `RRULE:FREQ=WEEKLY;BYDAY=${WEEKDAYS}`;
  }
}

const RULE = /^RRULE:FREQ=(DAILY|YEARLY|WEEKLY;BYDAY=(?:SU|MO|TU|WE|TH|FR|SA|MO,TU,WE,TH,FR)|MONTHLY;BYDAY=(?:[1-4]|-1)(?:SU|MO|TU|WE|TH|FR|SA))$/;

/** Whether `rule` is one of the rules `recurrenceRule` produces. */
export function isSupportedRule(rule: string) {
  return RULE.test(rule);
}

function nthWeekday(year: number, month: number, weekday: number, n: number, time: Date) {
  const d = new Date(year, month, 1, time.getHours(), time.getMinutes(), time.getSeconds());
  if (n === -1) {
    d.setMonth(month + 1, 0);
    d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
  } else {
    d.setDate(1 + ((weekday - d.getDay() + 7) % 7) + (n - 1) * 7);
  }
  return d;
}

/**
 * Start times of a supported rule's occurrences from `start` (inclusive) until
 * `until`, at most `limit`. Uses local time, like the rule itself.
 */
export function occurrences(rule: string, start: Date, until: Date, limit = 100): Date[] {
  if (!isSupportedRule(rule)) return [start];
  const byday = /BYDAY=([^;]+)/.exec(rule)?.[1] ?? "";
  const out: Date[] = [];
  const push = (d: Date) => d >= start && d <= until && out.length < limit && out.push(d);

  if (rule.includes("FREQ=MONTHLY")) {
    const n = Number(byday.slice(0, -2));
    const weekday = BYDAY.indexOf(byday.slice(-2));
    for (let i = 0; out.length < limit; i++) {
      const d = nthWeekday(start.getFullYear(), start.getMonth() + i, weekday, n, start);
      if (d > until) break;
      push(d);
    }
    return out;
  }

  const step = rule.includes("FREQ=YEARLY") ? "year" : rule.includes("FREQ=WEEKLY") && byday !== WEEKDAYS ? "week" : "day";
  for (let i = 0; out.length < limit; i++) {
    const d = new Date(start);
    if (step === "year") d.setFullYear(start.getFullYear() + i);
    else d.setDate(start.getDate() + i * (step === "week" ? 7 : 1));
    if (d > until) break;
    if (byday === WEEKDAYS && (d.getDay() === 0 || d.getDay() === 6)) continue;
    push(d);
  }
  return out;
}
