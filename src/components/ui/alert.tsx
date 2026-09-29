import { AlertCircle, Info } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  variant = "info",
  className,
  children,
}: {
  variant?: "info" | "error";
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = variant === "error" ? AlertCircle : Info;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        variant === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-rooms-light/20 bg-muted text-rooms-pale",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
