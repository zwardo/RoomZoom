import { AlertTriangle } from "lucide-react";
import { MetaList } from "@/components/ui/meta-list";
import { Tooltip } from "@/components/ui/tooltip";
import type { DistanceMethod } from "@/lib/rooms/types";
import { cn, formatFeet } from "@/lib/utils";

const methodLabel: Record<DistanceMethod, string> = {
  walking: "walking distance from your desk",
  straight: "straight-line distance from your desk",
  estimate: "estimated, the room is on another floor",
};

/** Figma "building, floor + distance": `Bldg 2 • Floor 1 • 75 ft`, or `--` when there's no room. */
export function LocationMeta({
  location,
  className,
}: {
  location: {
    buildingName: string;
    floorName: string | null;
    distanceFt?: number | null;
    distanceMethod?: DistanceMethod | null;
  } | null;
  className?: string;
}) {
  if (!location) return <span className={cn("text-xs text-rooms-xpale", className)}>--</span>;
  const { buildingName, floorName, distanceFt, distanceMethod } = location;
  return (
    <MetaList
      className={cn("text-xs text-rooms-xpale", className)}
      items={[
        buildingName,
        floorName && `Floor ${floorName}`,
        distanceFt != null && (
          <Tooltip content={distanceMethod && `${formatFeet(distanceFt)}: ${methodLabel[distanceMethod]}`}>
            <span className="inline-flex items-center gap-1">
              {formatFeet(distanceFt)}
              {distanceMethod === "estimate" && (
                <>
                  <AlertTriangle className="size-4 text-rooms-warn" aria-hidden />
                  <span className="sr-only">({methodLabel.estimate})</span>
                </>
              )}
            </span>
          </Tooltip>
        ),
      ]}
    />
  );
}
