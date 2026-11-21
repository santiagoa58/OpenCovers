import { GaugeIcon } from "lucide-react";
import { cn } from "cn";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { canEditSetup, useNavigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePacing } from "@/hooks/use-pacing";
import type { PacingSlot } from "@/lib/api";
import { useT } from "@/i18n";
import {
  HIGH_FROM,
  MEDIUM_FROM,
  pacingLevel,
  pacingRatio,
  peakSlot,
  type PacingLevel,
} from "@/lib/pacing";

const LEVEL: Record<PacingLevel, { bar: string; text: string; swatch: string }> = {
  empty: { bar: "bg-muted", text: "text-muted-foreground", swatch: "bg-muted" },
  low: { bar: "bg-success", text: "text-success", swatch: "bg-success" },
  medium: { bar: "bg-warning", text: "text-warning", swatch: "bg-warning" },
  high: { bar: "bg-destructive", text: "text-destructive", swatch: "bg-destructive" },
};

export function PacingView({
  venueId,
  date,
  time,
  onSelectTime,
}: {
  venueId: string;
  date: string;
  time: string;
  onSelectTime: (time: string) => void;
}) {
  const t = useT();
  const nav = useNavigation();
  const { data, isPending, isError, error, isRefetching, refetch } = usePacing(venueId, date);

  const pacing = data?.pacing ?? [];

  return (
    <section aria-label={t("pacing.title")} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <div>
          <h2 className="font-display text-xl">{t("pacing.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("pacing.floorHint")}</p>
        </div>
        <span className="text-sm font-medium tabular-nums">{t("floor.timeline.selected", { time })}</span>
      </div>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : isError && !data ? (
        <LoadError what={t("pacing.loadWhat")} error={error} retrying={isRefetching} onRetry={() => void refetch()} />
      ) : pacing.length === 0 ? (
        <EmptyState
          icon={GaugeIcon}
          title={t("pacing.empty.title")}
          description={t("pacing.empty.description")}
          action={
            nav && canEditSetup(nav.role) ? (
              <Button className="mt-2" onClick={() => nav.goTo("setup", "services")}>
                {t("pacing.empty.action")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {pacing.map((service) => {
            const peak = peakSlot(service.slots);
            return (
              <section key={service.service} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
                  <h2 className="font-display text-lg first-letter:uppercase">{service.service}</h2>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {peak
                      ? t("pacing.peak", { covers: peak.covers, capacity: peak.capacity, time: peak.time })
                      : t("pacing.nothingBooked")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-5 rounded-xl border bg-card p-4">
                  {groupByHour(service.slots).map((hour) => (
                    <div
                      key={hour[0].time}
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${hour.length}, 3rem)` }}
                    >
                      {hour.map((slot) => (
                        <SlotColumn
                          key={slot.time}
                          slot={slot}
                          selected={slot.time === time}
                          onSelectTime={onSelectTime}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm text-muted-foreground">
            <Legend level="low" label={t("pacing.level.low")} hint={t("pacing.hint.low", { percent: MEDIUM_FROM * 100 })} />
            <Legend
              level="medium"
              label={t("pacing.level.medium")}
              hint={t("pacing.hint.medium", { from: MEDIUM_FROM * 100, to: HIGH_FROM * 100 - 1 })}
            />
            <Legend level="high" label={t("pacing.level.high")} hint={t("pacing.hint.high", { percent: HIGH_FROM * 100 })} />
          </div>
        </>
      )}
    </section>
  );
}

/** Slots grouped by the hour they start in, so a long service wraps into rows instead of scrolling. */
function groupByHour(slots: PacingSlot[]): PacingSlot[][] {
  const groups: PacingSlot[][] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (last && last[0].time.slice(0, 2) === slot.time.slice(0, 2)) last.push(slot);
    else groups.push([slot]);
  }
  return groups;
}

function SlotColumn({
  slot,
  selected,
  onSelectTime,
}: {
  slot: PacingSlot;
  selected: boolean;
  onSelectTime: (time: string) => void;
}) {
  const t = useT();
  const level = pacingLevel(slot);
  const ratio = Math.min(pacingRatio(slot), 1);
  const style = LEVEL[level];
  return (
    <button
      type="button"
      data-testid={`floor-slot-${slot.time}`}
      aria-pressed={selected}
      aria-label={t("pacing.slotTitle", { time: slot.time, covers: slot.covers, capacity: slot.capacity })}
      onClick={() => onSelectTime(slot.time)}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary",
        selected && "bg-primary/10 ring-2 ring-primary",
      )}
      title={t("pacing.slotTitle", { time: slot.time, covers: slot.covers, capacity: slot.capacity })}
    >
      <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-muted/60">
        {slot.covers > 0 && (
          <div
            className={cn("w-full rounded-md transition-[height]", style.bar)}
            style={{ height: `${Math.max(ratio * 100, 6)}%` }}
          />
        )}
      </div>
      <div className={cn("text-xs font-semibold tabular-nums", style.text)}>
        {slot.covers}/{slot.capacity}
      </div>
      <div className="text-[11px] text-muted-foreground tabular-nums">{slot.time}</div>
    </button>
  );
}

function Legend({ level, label, hint }: { level: PacingLevel; label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={cn("size-3 rounded", LEVEL[level].swatch)} />
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-xs">{hint}</span>
    </span>
  );
}
