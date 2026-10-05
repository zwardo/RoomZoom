"use client";

import { AlignLeft, Bell, Briefcase, CircleHelp, type LucideIcon, MapPin, Plus, Users, Video, X } from "lucide-react";
import { useId, useState } from "react";
import { DEFAULT_FILTERS, type SearchContext, useRoomSearch } from "@/components/find/use-room-search";
import { Alert } from "@/components/ui/alert";
import { FilterChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { REPEATS, type Repeat, recurrenceRule, repeatLabel } from "@/lib/calendar/recurrence";
import type { GuestPermissions, Meeting, MeetingReminder } from "@/lib/calendar/types";
import type { RoomResult } from "@/lib/rooms/types";
import { fromInputs, toDateInput, toTimeInput } from "@/lib/time";
import { cn, formatFeet } from "@/lib/utils";

export interface CreatedMeeting {
  meeting: Meeting;
  message: string;
  /** The room booked with the meeting, if any. */
  room: RoomResult | null;
}

/** Google allows five reminders per event, up to four weeks ahead. */
const MAX_REMINDERS = 5;
const MAX_REMINDER_MINUTES = 40_320;
const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440, weeks: 10_080 } as const;
type ReminderUnit = keyof typeof UNIT_MINUTES;
type ReminderDraft = { method: MeetingReminder["method"]; amount: number; unit: ReminderUnit };

const NO_ROOM = "";
const OTHER_LOCATION = "other";
const NO_CONTEXT: SearchContext = { include: [], fromRoomId: null, personal: false, cover: [] };
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function shiftDate(date: string, days: number) {
  const d = fromInputs(date, "00:00");
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

function timeZoneName(at: Date) {
  return new Intl.DateTimeFormat(undefined, { timeZoneName: "long" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
}

function roomLabel(r: RoomResult) {
  return [
    r.name,
    [r.buildingName, r.floorName && `Floor ${r.floorName}`].filter(Boolean).join(" "),
    r.capacity != null && `${r.capacity} seats`,
    r.distanceFt != null && formatFeet(r.distanceFt),
    r.available === null && "availability unknown",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "New meeting" dialog, modeled on Google Calendar's event editor. */
export function CreateMeetingDialog({
  open,
  initial,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** Where the times start out, e.g. the slot the room search is showing. */
  initial: { start: Date; end: Date };
  onClose: () => void;
  onCreated: (result: CreatedMeeting) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        {open && <CreateMeetingForm initial={initial} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

/** One row of the details column: a decorative icon beside its fields. */
function DetailRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-3">
      <Icon className="mt-2 size-5 text-rooms-xlight" aria-hidden />
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-rooms-xpale", disabled && "opacity-60")}>
      <input
        type="checkbox"
        className="size-4 accent-[var(--color-rooms-accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

function CreateMeetingForm({ initial, onCreated }: { initial: { start: Date; end: Date }; onCreated: (result: CreatedMeeting) => void }) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => toDateInput(initial.start));
  const [startTime, setStartTime] = useState(() => toTimeInput(initial.start));
  const [endDate, setEndDate] = useState(() => toDateInput(initial.end));
  const [endTime, setEndTime] = useState(() => toTimeInput(initial.end));
  const [allDay, setAllDay] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [addMeet, setAddMeet] = useState(false);
  const [roomChoice, setRoomChoice] = useState(NO_ROOM);
  const [location, setLocation] = useState("");
  const [reminders, setReminders] = useState<ReminderDraft[]>([{ method: "popup", amount: 10, unit: "minutes" }]);
  const [showAs, setShowAs] = useState<"busy" | "free">("busy");
  const [visibility, setVisibility] = useState<"default" | "public" | "private">("default");
  const [description, setDescription] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [perms, setPerms] = useState<GuestPermissions>({ modify: false, inviteOthers: true, seeGuestList: true });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = fromInputs(startDate, allDay ? "00:00" : startTime);
  const end = fromInputs(endDate, allDay ? "00:00" : endTime);
  const timesValid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && (allDay ? end >= start : end > start);

  // An invalid slot skips the search; all-day meetings can't take a room.
  const slot = allDay || !timesValid ? { start: new Date(NaN), end: new Date(NaN) } : { start, end };
  const search = useRoomSearch(slot, DEFAULT_FILTERS, NO_CONTEXT, 0);
  const rooms = search.data?.rooms.filter((r) => r.matches) ?? [];
  const room = roomChoice !== NO_ROOM && roomChoice !== OTHER_LOCATION ? (rooms.find((r) => r.id === roomChoice) ?? null) : null;
  const roomBusy = !allDay && room?.available === false;

  /** Moving the start keeps the meeting's length, like Google. */
  function moveStart(date: string, time: string) {
    const length = timesValid ? end.getTime() - start.getTime() : 30 * 60_000;
    const next = fromInputs(date, allDay ? "00:00" : time);
    setStartDate(date);
    setStartTime(time);
    if (Number.isNaN(next.getTime())) return;
    const nextEnd = new Date(next.getTime() + length);
    setEndDate(toDateInput(nextEnd));
    if (!allDay) setEndTime(toTimeInput(nextEnd));
  }

  /** Adds every complete address in `text`; keeps whatever isn't one in the draft. */
  function addGuests(text: string) {
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    const valid = tokens.filter((t) => EMAIL.test(t)).map((t) => t.toLowerCase());
    const invalid = tokens.filter((t) => !EMAIL.test(t));
    if (valid.length) setGuests((g) => [...new Set([...g, ...valid])]);
    setGuestDraft(invalid.join(" "));
    setGuestError(invalid.length ? `"${invalid[0]}" isn't an email address.` : null);
    return valid;
  }

  const patchReminder = (i: number, patch: Partial<ReminderDraft>) =>
    setReminders((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!timesValid) return setError("End must be after start.");
    if (roomBusy) return setError(`${room?.name} is busy then. Pick another room or time.`);
    const drafted = guestDraft ? addGuests(guestDraft) : [];
    if (guestDraft.split(/[\s,;]+/).some((t) => t && !EMAIL.test(t))) return;
    const allGuests = [...new Set([...guests, ...drafted])];
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          allDay,
          start: allDay ? startDate : start.toISOString(),
          // Google's all-day end date is exclusive.
          end: allDay ? shiftDate(endDate, 1) : end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          recurrence: recurrenceRule(repeat, start) ?? undefined,
          roomId: !allDay && room ? room.id : undefined,
          location: roomChoice === OTHER_LOCATION || allDay ? location.trim() || undefined : undefined,
          guests: allGuests,
          description: description.trim() || undefined,
          addMeet,
          reminders: reminders.map((r) => ({
            method: r.method,
            minutes: Math.min(MAX_REMINDER_MINUTES, Math.max(0, Math.round(r.amount * UNIT_MINUTES[r.unit]))),
          })),
          showAs,
          visibility,
          guestPermissions: perms,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't create the meeting");
      onCreated({ ...(body as Omit<CreatedMeeting, "room">), room: allDay ? null : room });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the meeting");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex flex-col gap-3 px-6 pt-6 pr-12">
        <DialogTitle className="text-sm font-semibold text-rooms-xlight">New meeting</DialogTitle>
        <DialogDescription className="sr-only">Add a meeting to your calendar, optionally with a room.</DialogDescription>
        <Label htmlFor={`${id}-title`} className="sr-only">
          Title
        </Label>
        <Input
          id={`${id}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add title"
          autoFocus
          maxLength={200}
          className="h-auto rounded-none border-0 border-b-2 border-rooms-light/30 bg-transparent px-0 pb-1 text-2xl focus-visible:border-rooms-light focus-visible:ring-0"
        />
      </div>

      <div className="scrollbar-auto-hide flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">When</legend>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={`${id}-start-date`} className="sr-only">
              Start date
            </Label>
            <Input
              id={`${id}-start-date`}
              type="date"
              required
              value={startDate}
              onChange={(e) => moveStart(e.target.value, startTime)}
              className="w-auto"
            />
            {!allDay && (
              <>
                <Label htmlFor={`${id}-start-time`} className="sr-only">
                  Start time
                </Label>
                <Input
                  id={`${id}-start-time`}
                  type="time"
                  step={900}
                  required
                  value={startTime}
                  onChange={(e) => moveStart(startDate, e.target.value)}
                  className="w-auto"
                />
              </>
            )}
            <span className="text-sm text-rooms-xlight">to</span>
            {!allDay && (
              <>
                <Label htmlFor={`${id}-end-time`} className="sr-only">
                  End time
                </Label>
                <Input
                  id={`${id}-end-time`}
                  type="time"
                  step={900}
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  aria-invalid={!timesValid}
                  className="w-auto aria-invalid:border-rooms-warn"
                />
              </>
            )}
            <Label htmlFor={`${id}-end-date`} className="sr-only">
              End date
            </Label>
            <Input
              id={`${id}-end-date`}
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-invalid={!timesValid}
              className="w-auto aria-invalid:border-rooms-warn"
            />
            {!allDay && !Number.isNaN(start.getTime()) && <span className="text-xs text-rooms-xlight">{timeZoneName(start)}</span>}
          </div>
          {!timesValid && <p className="text-xs text-rooms-warn">End must be after start.</p>}
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox checked={allDay} onChange={setAllDay}>
              All day
            </Checkbox>
            <Label htmlFor={`${id}-repeat`} className="sr-only">
              Repeat
            </Label>
            <Select id={`${id}-repeat`} value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} className="w-auto">
              {REPEATS.map((r) => (
                <option key={r} value={r}>
                  {Number.isNaN(start.getTime()) ? r : repeatLabel(r, start)}
                </option>
              ))}
            </Select>
          </div>
          {allDay && (
            <p className="text-xs text-rooms-xlight">All-day meetings go on your calendar but don&apos;t show in the meetings list.</p>
          )}
        </fieldset>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex flex-col gap-4">
            <DetailRow icon={Video}>
              <div className="flex items-center gap-2">
                <Button size="sm" aria-pressed={addMeet} onClick={() => setAddMeet((m) => !m)}>
                  {addMeet ? "Google Meet will be added" : "Add Google Meet video conferencing"}
                </Button>
                {addMeet && (
                  <IconButton aria-label="Remove Google Meet" onClick={() => setAddMeet(false)}>
                    <X />
                  </IconButton>
                )}
              </div>
            </DetailRow>

            <DetailRow icon={MapPin}>
              {allDay ? (
                <>
                  <Label htmlFor={`${id}-location`} className="sr-only">
                    Location
                  </Label>
                  <Input id={`${id}-location`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" />
                  <p className="text-xs text-rooms-xlight">Rooms can only be booked for timed meetings.</p>
                </>
              ) : (
                <>
                  <Label htmlFor={`${id}-room`} className="sr-only">
                    Room
                  </Label>
                  <Select
                    id={`${id}-room`}
                    value={roomChoice}
                    onChange={(e) => setRoomChoice(e.target.value)}
                    aria-invalid={roomBusy}
                    aria-describedby={`${id}-room-status`}
                    className="aria-invalid:border-rooms-warn"
                  >
                    <option value={NO_ROOM}>No room</option>
                    {rooms.some((r) => r.available !== false) && (
                      <optgroup label="Free">
                        {rooms
                          .filter((r) => r.available !== false)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {roomLabel(r)}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {rooms.some((r) => r.available === false) && (
                      <optgroup label="Busy">
                        {rooms
                          .filter((r) => r.available === false)
                          .map((r) => (
                            <option key={r.id} value={r.id} disabled={r.id !== roomChoice}>
                              {roomLabel(r)}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <option value={OTHER_LOCATION}>Somewhere else…</option>
                  </Select>
                  <p id={`${id}-room-status`} className={cn("text-xs", roomBusy ? "text-rooms-warn" : "text-rooms-xlight")} aria-live="polite">
                    {roomBusy
                      ? `${room?.name} is busy then. Pick another room or time.`
                      : search.loading
                        ? "Checking room availability…"
                        : search.error
                          ? search.error
                          : timesValid
                            ? `${rooms.filter((r) => r.available === true).length} of ${rooms.length} rooms free`
                            : null}
                  </p>
                  {roomChoice === OTHER_LOCATION && (
                    <>
                      <Label htmlFor={`${id}-location`} className="sr-only">
                        Location
                      </Label>
                      <Input
                        id={`${id}-location`}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Add location"
                        autoFocus
                      />
                    </>
                  )}
                </>
              )}
            </DetailRow>

            <DetailRow icon={Bell}>
              {reminders.map((r, i) => (
                <fieldset key={i} className="flex flex-wrap items-center gap-2">
                  <legend className="sr-only">Notification {i + 1}</legend>
                  <Select
                    aria-label="Notify by"
                    value={r.method}
                    onChange={(e) => patchReminder(i, { method: e.target.value as ReminderDraft["method"] })}
                    className="w-auto"
                  >
                    <option value="popup">Notification</option>
                    <option value="email">Email</option>
                  </Select>
                  <Input
                    aria-label="Amount"
                    type="number"
                    min={0}
                    max={Math.floor(MAX_REMINDER_MINUTES / UNIT_MINUTES[r.unit])}
                    value={r.amount}
                    onChange={(e) => patchReminder(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-20"
                  />
                  <Select
                    aria-label="Unit"
                    value={r.unit}
                    onChange={(e) => patchReminder(i, { unit: e.target.value as ReminderUnit })}
                    className="w-auto"
                  >
                    {Object.keys(UNIT_MINUTES).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                  <IconButton aria-label="Remove notification" onClick={() => setReminders((list) => list.filter((_, j) => j !== i))}>
                    <X />
                  </IconButton>
                </fieldset>
              ))}
              {reminders.length < MAX_REMINDERS && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setReminders((list) => [...list, { method: "popup", amount: 30, unit: "minutes" }])}
                >
                  <Plus aria-hidden />
                  Add notification
                </Button>
              )}
            </DetailRow>

            <DetailRow icon={Briefcase}>
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label="Show as" value={showAs} onChange={(e) => setShowAs(e.target.value as typeof showAs)} className="w-auto">
                  <option value="busy">Busy</option>
                  <option value="free">Free</option>
                </Select>
                <Select
                  aria-label="Visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                  className="w-auto"
                >
                  <option value="default">Default visibility</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </Select>
                <Tooltip content="Private hides the details from people who can see your calendar but aren't invited. Default follows your calendar's sharing settings.">
                  <button
                    type="button"
                    aria-label="About visibility"
                    className="rounded-md p-0.5 text-rooms-xlight hover:text-rooms-light focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <CircleHelp className="size-5" aria-hidden />
                  </button>
                </Tooltip>
              </div>
            </DetailRow>

            <DetailRow icon={AlignLeft}>
              <Label htmlFor={`${id}-description`} className="sr-only">
                Description
              </Label>
              <Textarea
                id={`${id}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description"
                maxLength={8000}
                className="min-h-32 font-sans text-sm"
              />
            </DetailRow>
          </div>

          <section aria-labelledby={`${id}-guests-heading`} className="flex flex-col gap-3">
            <h3 id={`${id}-guests-heading`} className="flex items-center gap-2 text-sm font-semibold text-rooms-xpale">
              <Users className="size-4 text-rooms-xlight" aria-hidden />
              Guests{guests.length > 0 && <span className="font-normal text-rooms-xlight">({guests.length + 1} with you)</span>}
            </h3>
            <Label htmlFor={`${id}-guests`} className="sr-only">
              Add guests by email
            </Label>
            <Input
              id={`${id}-guests`}
              type="text"
              inputMode="email"
              autoComplete="off"
              value={guestDraft}
              placeholder="Add guests"
              aria-invalid={Boolean(guestError)}
              aria-describedby={`${id}-guests-hint`}
              onChange={(e) => {
                setGuestError(null);
                if (/[\s,;]$/.test(e.target.value)) addGuests(e.target.value);
                else setGuestDraft(e.target.value);
              }}
              onPaste={(e) => {
                e.preventDefault();
                addGuests(`${guestDraft} ${e.clipboardData.getData("text")}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGuests(guestDraft);
                } else if (e.key === "Backspace" && !guestDraft && guests.length) {
                  setGuests((g) => g.slice(0, -1));
                }
              }}
              onBlur={() => guestDraft && addGuests(guestDraft)}
              className="aria-invalid:border-rooms-warn"
            />
            <p id={`${id}-guests-hint`} className={cn("text-xs", guestError ? "text-rooms-warn" : "text-rooms-xlight")}>
              {guestError ?? "Press Enter or comma after each email."}
            </p>
            {guests.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Guests">
                {guests.map((g) => (
                  <li key={g} className="max-w-full">
                    <FilterChip variant="default" onRemove={() => setGuests((list) => list.filter((x) => x !== g))} removeLabel={`Remove ${g}`}>
                      {g}
                    </FilterChip>
                  </li>
                ))}
              </ul>
            )}

            <fieldset className="mt-3 flex flex-col gap-2">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Guest permissions</legend>
              <Checkbox
                checked={perms.modify}
                onChange={(modify) => setPerms((p) => (modify ? { modify, inviteOthers: true, seeGuestList: true } : { ...p, modify }))}
              >
                Modify event
              </Checkbox>
              <Checkbox checked={perms.inviteOthers} disabled={perms.modify} onChange={(inviteOthers) => setPerms((p) => ({ ...p, inviteOthers }))}>
                Invite others
              </Checkbox>
              <Checkbox checked={perms.seeGuestList} disabled={perms.modify} onChange={(seeGuestList) => setPerms((p) => ({ ...p, seeGuestList }))}>
                See guest list
              </Checkbox>
            </fieldset>
          </section>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-rooms-light/20 px-6 py-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" variant="solid" disabled={pending || !timesValid || roomBusy}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
