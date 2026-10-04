import { describe, expect, it } from "vitest";
import { isSupportedRule, occurrences, recurrenceRule, repeatLabel } from "./recurrence";

// Wednesday, September 30 2026 at 2:30pm local: the last Wednesday of its month.
const wed = new Date(2026, 8, 30, 14, 30);
// Wednesday, October 14 2026: the second Wednesday.
const secondWed = new Date(2026, 9, 14, 9, 0);

describe("repeatLabel", () => {
  it("describes each choice from the start date, like Google", () => {
    expect(repeatLabel("none", wed)).toBe("Does not repeat");
    expect(repeatLabel("weekly", wed)).toBe("Weekly on Wednesday");
    expect(repeatLabel("monthly", wed)).toBe("Monthly on the last Wednesday");
    expect(repeatLabel("monthly", secondWed)).toBe("Monthly on the second Wednesday");
    expect(repeatLabel("yearly", wed)).toBe("Annually on September 30");
    expect(repeatLabel("weekdays", wed)).toBe("Every weekday (Monday to Friday)");
  });
});

describe("recurrenceRule", () => {
  it("builds the RRULE for each choice", () => {
    expect(recurrenceRule("none", wed)).toBeNull();
    expect(recurrenceRule("daily", wed)).toBe("RRULE:FREQ=DAILY");
    expect(recurrenceRule("weekly", wed)).toBe("RRULE:FREQ=WEEKLY;BYDAY=WE");
    expect(recurrenceRule("monthly", wed)).toBe("RRULE:FREQ=MONTHLY;BYDAY=-1WE");
    expect(recurrenceRule("monthly", secondWed)).toBe("RRULE:FREQ=MONTHLY;BYDAY=2WE");
    expect(recurrenceRule("yearly", wed)).toBe("RRULE:FREQ=YEARLY");
    expect(recurrenceRule("weekdays", wed)).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  });

  it("only accepts the rules it builds", () => {
    expect(isSupportedRule("RRULE:FREQ=MONTHLY;BYDAY=-1WE")).toBe(true);
    expect(isSupportedRule("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")).toBe(true);
    expect(isSupportedRule("RRULE:FREQ=HOURLY")).toBe(false);
    expect(isSupportedRule("RRULE:FREQ=DAILY;COUNT=3\nEXDATE:20260101")).toBe(false);
  });
});

describe("occurrences", () => {
  const until = (days: number) => new Date(wed.getTime() + days * 86_400_000);

  it("steps daily and weekly, keeping the time of day", () => {
    expect(occurrences("RRULE:FREQ=DAILY", wed, until(2)).map((d) => d.getDate())).toEqual([30, 1, 2]);
    const weekly = occurrences("RRULE:FREQ=WEEKLY;BYDAY=WE", wed, until(14));
    expect(weekly.map((d) => [d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()])).toEqual([
      [8, 30, 14, 30],
      [9, 7, 14, 30],
      [9, 14, 14, 30],
    ]);
  });

  it("skips weekends for every weekday", () => {
    const days = occurrences("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", wed, until(6)).map((d) => d.getDay());
    expect(days).toEqual([3, 4, 5, 1, 2]);
  });

  it("lands on the nth or last weekday each month", () => {
    const last = occurrences("RRULE:FREQ=MONTHLY;BYDAY=-1WE", wed, until(92)).map((d) => [d.getMonth(), d.getDate()]);
    expect(last).toEqual([
      [8, 30],
      [9, 28],
      [10, 25],
      [11, 30],
    ]);
    const second = occurrences("RRULE:FREQ=MONTHLY;BYDAY=2WE", secondWed, new Date(2026, 11, 31));
    expect(second.map((d) => d.getDate())).toEqual([14, 11, 9]);
  });

  it("stops at the limit", () => {
    expect(occurrences("RRULE:FREQ=DAILY", wed, until(365), 5)).toHaveLength(5);
  });
});
