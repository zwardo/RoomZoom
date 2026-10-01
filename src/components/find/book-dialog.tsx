"use client";

import { useState } from "react";
import { LocalTime } from "@/components/local-time";
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

export function BookDialog({
  room,
  start,
  end,
  meeting,
  replaceExisting,
  onClose,
  onBooked,
}: {
  room: RoomResult | null;
  start: string;
  end: string;
  meeting: Meeting | null;
  replaceExisting: boolean;
  onClose: () => void;
  onBooked: (result: BookingResult) => void;
}) {
  return (
    <Dialog open={Boolean(room)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {room && (
          <BookForm
            key={room.id}
            room={room}
            start={start}
            end={end}
            meeting={meeting}
            replaceExisting={replaceExisting}
            onBooked={onBooked}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookForm({
  room,
  start,
  end,
  meeting,
  replaceExisting,
  onBooked,
}: {
  room: RoomResult;
  start: string;
  end: string;
  meeting: Meeting | null;
  replaceExisting: boolean;
  onBooked: (result: BookingResult) => void;
}) {
  const [title, setTitle] = useState("Meeting");
  const [guests, setGuests] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swapping = Boolean(meeting && replaceExisting && meeting.rooms.length);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          start,
          end,
          ...(meeting
            ? { eventId: meeting.id, replaceExisting }
            : {
                title: title.trim() || "Meeting",
                guests: guests
                  .split(/[\s,;]+/)
                  .map((g) => g.trim())
                  .filter(Boolean),
              }),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Booking failed");
      onBooked(body as BookingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1">
        <DialogTitle>
          {meeting ? (swapping ? `Switch to ${room.name}?` : `Book ${room.name} for your meeting?`) : `Book ${room.name}`}
        </DialogTitle>
        <DialogDescription>
          {room.buildingName} · Floor {room.floorName ?? "?"} · {room.capacity ?? "?"} people
          <br />
          <LocalTime iso={start} format="datetime" /> – <LocalTime iso={end} />
        </DialogDescription>
      </div>

      {meeting ? (
        <p className="text-sm">
          <span className="font-medium">{meeting.title}</span>
          {swapping && (
            <span className="text-muted-foreground"> · replaces {meeting.rooms.map((r) => r.name).join(", ")}</span>
          )}
        </p>
      ) : (
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
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? "Booking…" : swapping ? "Switch room" : "Book room"}
        </Button>
      </div>
    </form>
  );
}
