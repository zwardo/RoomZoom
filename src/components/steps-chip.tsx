import Image from "next/image";
import { Tooltip } from "@/components/ui/tooltip";
import type { MeetingView } from "@/lib/meetings/load";

const FEET_PER_STEP = 2.5;

/** Round trips from the desk to each of the day's booked rooms, in steps. */
export function estimateSteps(views: MeetingView[]) {
  const feet = views.reduce((sum, v) => sum + (v.location?.distanceFt ?? 0) * 2, 0);
  return Math.round(feet / FEET_PER_STEP);
}

/** Figma header "steps" chip. */
export function StepsChip({ steps }: { steps: number }) {
  return (
    <Tooltip content="Estimated walking from your desk to today's meeting rooms and back" side="bottom">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-rooms-light/30 px-2 py-1 text-xs text-rooms-xpale">
        <Image src="/icons/steps.svg" alt="" width={16} height={16} />~{steps.toLocaleString()} steps today
      </p>
    </Tooltip>
  );
}
