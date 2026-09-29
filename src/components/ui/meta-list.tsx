import * as React from "react";
import { cn } from "@/lib/utils";

/** A row of short facts separated by the Figma 4px "accent" dot. Falsy items are skipped. */
export function MetaList({ items, className }: { items: React.ReactNode[]; className?: string }) {
  const shown = items.filter((item) => item !== null && item !== undefined && item !== false && item !== "");
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {shown.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="size-1 shrink-0 rounded-full bg-current opacity-80" aria-hidden />}
          <span className="inline-flex items-center gap-1.5">{item}</span>
        </React.Fragment>
      ))}
    </span>
  );
}
