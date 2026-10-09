"use client";

import { useState } from "react";
import { LocalTime } from "@/components/local-time";
import type { CardRoom } from "@/components/rooms/room-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import type { Meeting } from "@/lib/calendar/types";
import type { RoomResult } from "@/lib/rooms/types";

export interface BookingResult {
  meeting: Meeting;
  message: string;
}

/**
 * "create" books a new meeting for the time slot, "book" confirms a meeting's first room, and
 * "change" adds the room to a meeting that has rooms or switches one of them out.
 */
export type BookMode = "create" | "book" | "change";

export interface BookingRequest {
  mode: BookMode;
  room: RoomResult;
  meeting: Meeting | null;
  /** For "change": the option chosen up front ("switch" picks the only room when there is one). */
  preselect?: "add" | "switch";
}

const ADD = "add";

async function send(method: "POST" | "DELETE", body: unknown, fallback: string): Promise<BookingResult> {
  const res = await fetch("/api/bookings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? fallback);
  return json as BookingResult;
}

/** Books `roomId`: onto `eventId` when given (replacing `replaceEmails`), else as a new meeting. */
export function bookRoom(body: {
  roomId: string;
  start: string;
  end: string;
  eventId?: string;
  replaceEmails?: string[];
  title?: string;
  guests?: string[];
}) {
  return send("POST", body, "Booking failed");
}

export function removeRoom(eventId: string, roomEmail: string) {
  return send("DELETE", { eventId, roomEmail }, "Couldn't remove the room");
}

export function BookDialog({
  request,
  start,
  end,
  onClose,
  onBooked,
}: {
  request: BookingRequest | null;
  start: string;
  end: string;
  onClose: () => void;
  onBooked: (result: BookingResult) => void;
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {request && <BookForm key={`${request.mode}:${request.preselect}:${request.room.id}`} {...request} start={start} end={end} onBooked={onBooked} />}
      </DialogContent>
    </Dialog>
  );
}

function BookForm({
  mode,
  room,
  meeting,
  preselect,
  start,
  end,
  onBooked,
}: BookingRequest & {
  start: string;
  end: string;
  onBooked: (result: BookingResult) => void;
}) {
  const [title, setTitle] = useState("Meeting");
  const [guests, setGuests] = useState("");
  const current = meeting?.rooms ?? [];
  const changing = mode === "change" && current.length > 0;
  // ADD, or the email of the room to replace.
  const [choice, setChoice] = useState<string | null>(
    preselect === "add" ? ADD : preselect === "switch" && current.length === 1 ? current[0].email : null,
  );
  const replace = changing && choice !== ADD ? choice : null;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      onBooked(
        await bookRoom({
          roomId: room.id,
          start,
          end,
          ...(meeting
            ? { eventId: meeting.id, replaceEmails: replace ? [replace] : undefined }
            : {
                title: title.trim() || "Meeting",
                guests: guests
                  .split(/[\s,;]+/)
                  .map((g) => g.trim())
                  .filter(Boolean),
              }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setPending(false);
    }
  }

  const heading = meeting ? `Book ${room.name} for ${meeting.title}?` : `Book ${room.name}`;
  const submitLabel = !changing ? "Book room" : replace ? "Switch room" : choice === ADD ? "Add room" : "Book room";

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1">
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription>
          {room.buildingName} · Floor {room.floorName ?? "?"} · {room.capacity ?? "?"} people
          <br />
          <LocalTime iso={start} format="datetime" /> – <LocalTime iso={end} />
        </DialogDescription>
      </div>

      {changing && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">
            {meeting?.title} already has {current.map((r) => r.name).join(", ")}.
          </legend>
          {[
            { value: ADD, label: `Add ${room.name} as another room` },
            ...current.map((r) => ({ value: r.email, label: `Replace ${r.name}` })),
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-rooms-light/30 px-3 py-2 text-sm transition-colors hover:bg-rooms-light/10 has-[:checked]:border-rooms-accent has-[:checked]:bg-rooms-accent/10"
            >
              <input
                type="radio"
                name="room-change"
                value={option.value}
                checked={choice === option.value}
                onChange={() => setChoice(option.value)}
                className="size-4 accent-rooms-accent"
                required
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}

      {!meeting && (
        <>
          <Field label="Title" htmlFor="book-title">
            <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </Field>
          <Field label="Guests (optional, comma-separated emails)" htmlFor="book-guests">
            <Input
              id="book-guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              placeholder="alex@example.com, sam@example.com"
            />
          </Field>
        </>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button variant="outline" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" variant="solid" disabled={pending || (changing && !choice)}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export interface RemovalRequest {
  room: CardRoom;
  meeting: Meeting;
}

/** Confirms taking a room off a meeting. */
export function RemoveRoomDialog({
  request,
  onClose,
  onRemoved,
}: {
  request: RemovalRequest | null;
  onClose: () => void;
  onRemoved: (result: BookingResult) => void;
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{request && <RemoveForm key={request.room.email} {...request} onRemoved={onRemoved} />}</DialogContent>
    </Dialog>
  );
}

function RemoveForm({ room, meeting, onRemoved }: RemovalRequest & { onRemoved: (result: BookingResult) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = meeting.rooms.length === 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      onRemoved(await removeRoom(meeting.id, room.email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the room");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1">
        <DialogTitle>Remove {room.name}?</DialogTitle>
        <DialogDescription>
          {last ? `${meeting.title} won't have a room booked.` : `It comes off ${meeting.title}; the other rooms stay booked.`}
        </DialogDescription>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button variant="outline" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Removing…" : "Remove room"}
        </Button>
      </div>
    </form>
  );
}
