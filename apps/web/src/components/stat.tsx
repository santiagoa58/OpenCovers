import type { ReactNode } from "react";
import { cn } from "cn";

type StatTone = "default" | "warning" | "danger";
type StatVariant = "card" | "inline";

/** Shared metric with a card treatment for dashboards and an inline treatment for summaries. */
export function Stat({
  label,
  value,
  tone = "default",
  variant = "card",
}: {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  variant?: StatVariant;
}) {
  const card = variant === "card";
  return (
    <div
      data-slot="stat"
      className={cn(
        card && "rounded-xl border bg-card p-4",
        card && tone === "warning" && "border-transparent bg-warning-soft text-warning",
        card && tone === "danger" && "border-transparent bg-danger-soft text-destructive",
      )}
    >
      <div className={cn(card ? "text-sm" : "text-xs", tone === "default" && "text-muted-foreground")}>
        {label}
      </div>
      <div
        className={cn(
          "font-display whitespace-nowrap tabular-nums",
          card && "mt-1 text-3xl sm:text-4xl",
          !card && "mt-0.5 text-2xl",
          !card && tone === "warning" && "text-warning",
          !card && tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}
