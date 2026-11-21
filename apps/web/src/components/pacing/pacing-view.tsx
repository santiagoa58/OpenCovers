import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, GaugeIcon } from "lucide-react";
import { cn } from "cn";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { canEditSetup, useNavigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePacing } from "@/hooks/use-pacing";
import type { PacingSlot } from "@/lib/api";
import { useT } from "@/i18n";
import { useTimeDisplay } from "@/lib/time-format";
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
    <section aria-labelledby="floor-pacing-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <div>
          <h2 id="floor-pacing-title" className="font-display text-xl">{t("pacing.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("pacing.floorHint")}</p>
        </div>
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
          {pacing.map((service) => (
            <ServiceTimeline
              key={service.service}
              name={service.service}
              slots={service.slots}
              selectedTime={time}
              onSelectTime={onSelectTime}
            />
          ))}
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

/**
 * A single timeline is easier to scan than wrapping each hour into disconnected rows.
 * The viewport stays a normal horizontal scroll area on touch devices, with buttons
 * for mouse and keyboard users. Only this strip scrolls, never the entire page.
 */
function ServiceTimeline({
  name,
  slots,
  selectedTime,
  onSelectTime,
}: {
  name: string;
  slots: PacingSlot[];
  selectedTime: string;
  onSelectTime: (time: string) => void;
}) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const peak = peakSlot(slots);

  const updateScrollState = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    setCanScrollBack(strip.scrollLeft > 1);
    setCanScrollForward(strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [slots, updateScrollState]);

  // Keep the selected floor snapshot in view, including after a URL reload or time-picker change.
  useEffect(() => {
    const strip = stripRef.current;
    const selected = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !selected) return;
    strip.scrollLeft = Math.max(0, selected.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2);
    updateScrollState();
  }, [selectedTime, slots, updateScrollState]);

  const scroll = (direction: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const distance = Math.max(150, strip.clientWidth * 0.7) * direction;
    if (typeof strip.scrollBy === "function") {
      strip.scrollBy({ left: distance, behavior: "smooth" });
    } else {
      strip.scrollLeft += distance;
      updateScrollState();
    }
  };

  return (
    <section className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <h3 className="font-display text-lg first-letter:uppercase">{name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums">
            {peak
              ? t("pacing.peak", { covers: peak.covers, capacity: peak.capacity, time: displayTime(peak.time) })
              : t("pacing.nothingBooked")}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-11 sm:size-9"
              aria-label={t("pacing.scrollEarlier")}
              disabled={!canScrollBack}
              onClick={() => scroll(-1)}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-11 sm:size-9"
              aria-label={t("pacing.scrollLater")}
              disabled={!canScrollForward}
              onClick={() => scroll(1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      <div className="min-w-0 rounded-xl border bg-card px-2 pt-3 pb-2 sm:px-3">
        <div
          ref={stripRef}
          role="region"
          aria-label={t("pacing.scrollRegion", { service: name })}
          tabIndex={0}
          onScroll={updateScrollState}
          data-testid="booking-load-strip"
          className="relative flex min-w-0 snap-x snap-proximity gap-1.5 overflow-x-auto overscroll-x-contain rounded-md px-1 pt-1 pb-3 touch-pan-x focus-visible:outline-2 focus-visible:outline-primary sm:gap-2"
        >
          {slots.map((slot) => (
            <SlotColumn
              key={slot.time}
              slot={slot}
              selected={slot.time === selectedTime}
              onSelectTime={onSelectTime}
            />
          ))}
        </div>
      </div>
      <p className="px-1 text-xs text-muted-foreground sm:hidden">{t("pacing.scrollHint")}</p>
    </section>
  );
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
  const displayTime = useTimeDisplay();
  const level = pacingLevel(slot);
  const ratio = Math.min(pacingRatio(slot), 1);
  const style = LEVEL[level];
  return (
    <button
      type="button"
      data-testid={`floor-slot-${slot.time}`}
      aria-pressed={selected}
      aria-label={t("pacing.slotTitle", { time: displayTime(slot.time), covers: slot.covers, capacity: slot.capacity })}
      onClick={() => onSelectTime(slot.time)}
      className={cn(
        "flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1 rounded-lg p-1.5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary sm:w-[4.75rem]",
        selected && "bg-primary/10 ring-2 ring-primary",
      )}
      title={t("pacing.slotTitle", { time: displayTime(slot.time), covers: slot.covers, capacity: slot.capacity })}
    >
      <div className="flex h-[4.75rem] w-full items-end overflow-hidden rounded-md bg-muted/60 sm:h-20">
        {slot.covers > 0 && (
          <div
            className={cn("w-full rounded-md transition-[height]", style.bar)}
            style={{ height: `${Math.max(ratio * 100, 6)}%` }}
          />
        )}
      </div>
      <div className={cn("whitespace-nowrap text-xs font-semibold tabular-nums", style.text)}>
        {slot.covers}/{slot.capacity}
      </div>
      <div className="whitespace-nowrap text-[11px] leading-4 text-muted-foreground tabular-nums">{displayTime(slot.time)}</div>
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
