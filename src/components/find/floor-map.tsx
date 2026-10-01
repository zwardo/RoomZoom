"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import type { FloorSummary, MyDesk, Point, RoomResult } from "@/lib/rooms/types";
import { cn, formatFeet } from "@/lib/utils";

const PHONE_BOOTH = /phone|booth/i;

type RoomState = "available" | "busy" | "unknown" | "selected";

/** Figma "Room" map component states, as SVG fill/stroke classes. */
const roomStyles: Record<RoomState, { shape: string; label: string }> = {
  available: {
    shape: "fill-rooms-light/20 stroke-rooms-light hover:fill-rooms-light/40 focus-visible:fill-rooms-light/40",
    label: "fill-rooms-xpale",
  },
  busy: { shape: "fill-rooms-warn/10 stroke-rooms-warn/60 hover:fill-rooms-warn/20", label: "fill-rooms-warn" },
  unknown: {
    shape: "fill-rooms-light/10 stroke-rooms-xlight [stroke-dasharray:6_4] hover:fill-rooms-light/30",
    label: "fill-rooms-xlight",
  },
  selected: { shape: "fill-rooms-accent/20 stroke-rooms-accent", label: "fill-rooms-xpale" },
};

const phoneBoothShape = "fill-rooms-phone-booth/20 stroke-rooms-phone-booth hover:fill-rooms-phone-booth/40";

function stateOf(room: RoomResult, selectedId: string | undefined): RoomState {
  if (room.id === selectedId) return "selected";
  if (room.available === true) return "available";
  if (room.available === false) return "busy";
  return "unknown";
}

function toPoints(points: Point[]) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function bounds(points: Point[]) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { cx: (minX + Math.max(...xs)) / 2, cy: (minY + Math.max(...ys)) / 2, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

export function FloorMap({
  floor,
  rooms,
  desk,
  selected,
  onSelect,
  showLegend = true,
  className,
}: {
  floor: FloorSummary;
  rooms: RoomResult[];
  desk: MyDesk | null;
  selected: RoomResult | null;
  onSelect: (room: RoomResult) => void;
  showLegend?: boolean;
  className?: string;
}) {
  const { widthPx: w, heightPx: h } = floor;
  const mapped = rooms.filter((r) => r.floorId === floor.id && (r.polygon || r.door));
  const unmapped = rooms.filter((r) => r.floorId === floor.id && !r.polygon && !r.door).length;
  const deskHere = desk?.floorId === floor.id ? desk : null;
  const route = selected?.route?.find((r) => r.floorId === floor.id)?.points;
  // Marker sizes scale with the drawing so they stay legible on large scans.
  const unit = Math.max(w, h) / 120;

  if (!w || !h) {
    return (
      <p className="rounded-lg border border-dashed border-rooms-light/30 p-8 text-center text-sm text-muted-foreground">
        No floor plan has been imported for {floor.buildingName} floor {floor.name} yet.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative max-h-full overflow-hidden rounded-lg bg-map-canvas" style={{ aspectRatio: `${w} / ${h}` }}>
        <TransformWrapper key={floor.id} minScale={1} maxScale={8}>
          <ZoomControls />
          <TransformComponent wrapperClass="!h-full !w-full" contentClass="!w-full">
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="h-auto w-full select-none"
              role="group"
              aria-label={`${floor.buildingName} floor ${floor.name} map`}
            >
              {/* Imported plans are dark-on-white line drawings; invert them onto the dark canvas. */}
              {floor.imageUrl && (
                <image href={floor.imageUrl} width={w} height={h} className="opacity-70 [filter:invert(1)_hue-rotate(180deg)_brightness(0.85)]" />
              )}
              {mapped.map((room) => {
                const state = stateOf(room, selected?.id);
                const booth = state !== "selected" && state !== "busy" && PHONE_BOOTH.test(room.name);
                const label = `${room.name}, ${room.available === true ? "free" : room.available === false ? "busy" : "availability unknown"}`;
                const tip = [label, room.capacity != null && `${room.capacity} seats`, room.distanceFt != null && formatFeet(room.distanceFt)]
                  .filter(Boolean)
                  .join(" · ");
                const common = {
                  className: cn(
                    "cursor-pointer transition-[fill] outline-none",
                    booth ? phoneBoothShape : roomStyles[state].shape,
                  ),
                  strokeWidth: state === "selected" ? unit * 0.5 : unit * 0.3,
                  role: "button",
                  tabIndex: 0,
                  "aria-label": label,
                  "aria-pressed": state === "selected",
                  onClick: () => onSelect(room),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(room);
                    }
                  },
                };
                if (!room.polygon) {
                  return (
                    <Tooltip key={room.id} content={tip}>
                      <circle cx={room.door![0]} cy={room.door![1]} r={unit * 1.5} {...common} />
                    </Tooltip>
                  );
                }
                const box = bounds(room.polygon);
                const fontSize = Math.min(unit * 1.6, box.w / Math.max(room.name.length, 4) * 1.5, box.h / 3);
                return (
                  <g key={room.id}>
                    <Tooltip content={tip}>
                      <polygon points={toPoints(room.polygon)} {...common} />
                    </Tooltip>
                    {/* Imported plans already print room names; label only bare outlines. */}
                    {!floor.imageUrl && fontSize > unit * 0.5 && (
                      <text
                        x={box.cx}
                        y={box.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize}
                        className={cn("pointer-events-none font-semibold", roomStyles[state].label)}
                        aria-hidden
                      >
                        {room.name}
                        {state === "busy" && (
                          <tspan x={box.cx} dy={fontSize * 1.3} fontSize={fontSize * 0.75} className="font-medium">
                            Busy
                          </tspan>
                        )}
                      </text>
                    )}
                  </g>
                );
              })}
              {route && route.length > 1 && (
                <g className="pointer-events-none">
                  <polyline
                    points={toPoints(route)}
                    className="fill-none stroke-map-route"
                    strokeWidth={unit * 0.35}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={`0 ${unit * 0.9}`}
                  />
                  <NavPoint point={route[route.length - 1]} unit={unit} />
                </g>
              )}
              {deskHere && (
                <g className="pointer-events-none" aria-label={`Your desk ${deskHere.label}`}>
                  <NavPoint point={[deskHere.x, deskHere.y]} unit={unit} />
                  <text
                    x={deskHere.x}
                    y={deskHere.y - unit * 2}
                    textAnchor="middle"
                    fontSize={unit * 1.4}
                    className="fill-rooms-accent font-medium [paint-order:stroke] stroke-map-canvas"
                    strokeWidth={unit * 0.4}
                  >
                    You
                  </text>
                </g>
              )}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Legend className="border-2 border-rooms-light bg-rooms-light/20">Free</Legend>
          <Legend className="border-2 border-rooms-warn/60 bg-rooms-warn/10">Busy</Legend>
          <Legend className="border-2 border-dashed border-rooms-xlight">Unknown</Legend>
          <Legend className="border-2 border-rooms-accent bg-rooms-accent/20">Selected</Legend>
          {deskHere && <Legend className="rounded-full bg-rooms-accent">Your desk ({deskHere.label})</Legend>}
          {unmapped > 0 && <span className="ml-auto">{unmapped} room{unmapped === 1 ? "" : "s"} not drawn on this map yet</span>}
        </div>
      )}
    </div>
  );
}

/** Figma ".content nav point": an accent dot with a soft halo, used for route ends and your desk. */
function NavPoint({ point: [x, y], unit }: { point: Point; unit: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={unit * 1.2} className="fill-rooms-accent/25" />
      <circle cx={x} cy={y} r={unit * 0.6} className="fill-rooms-accent" />
    </>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} aria-hidden />
      {children}
    </span>
  );
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 rounded-lg bg-rooms-dark/90 p-1">
      <IconButton onClick={() => zoomIn()} aria-label="Zoom in">
        <Plus />
      </IconButton>
      <IconButton onClick={() => zoomOut()} aria-label="Zoom out">
        <Minus />
      </IconButton>
      <IconButton onClick={() => resetTransform()} aria-label="Reset zoom">
        <RotateCcw />
      </IconButton>
    </div>
  );
}
