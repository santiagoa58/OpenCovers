import { usePacing } from "@/hooks/use-pacing";
import { useT } from "@/i18n";
import { cn } from "cn";

interface SeatingTimelineProps {
  venueId: string;
  date: string;
  time: string;
  onSelectTime: (time: string) => void;
}

/** Compact occupancy timeline shared with the floor map's date/time selection. */
export function SeatingTimeline({ venueId, date, time, onSelectTime }: SeatingTimelineProps) {
  const t = useT();
  const { data, isPending, isError } = usePacing(venueId, date);
  const services = data?.pacing ?? [];

  return (
    <section aria-label={t("floor.timeline.title")} className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t("floor.timeline.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("floor.timeline.help")}</p>
        </div>
        <span className="text-sm font-medium tabular-nums">{t("floor.timeline.selected", { time })}</span>
      </div>
      {isPending ? (
        <p className="text-sm text-muted-foreground">{t("floor.timeline.loading")}</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">{t("floor.timeline.error")}</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pacing.empty.title")}</p>
      ) : (
        services.map((service) => (
          <div key={service.service} className="space-y-2">
            <h3 className="text-sm font-medium">{service.service}</h3>
            <div className="overflow-x-auto pb-1">
              <div className="flex w-max min-w-full gap-1.5">
                {service.slots.map((slot) => {
                  const chosen = time === slot.time;
                  const percentage = slot.capacity > 0
                    ? Math.min(100, Math.round(100 * slot.covers / slot.capacity))
                    : 0;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      aria-pressed={chosen}
                      aria-label={t("floor.timeline.slot", { time: slot.time, covers: slot.covers, capacity: slot.capacity })}
                      data-testid={`floor-slot-${slot.time}`}
                      onClick={() => onSelectTime(slot.time)}
                      className={cn(
                        "relative flex min-w-[4.5rem] flex-col items-center rounded-md border px-2 pb-3 pt-2 text-xs transition-colors hover:border-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary",
                        chosen ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border",
                        !chosen && slot.covers > 0 && "bg-warning/10",
                      )}
                    >
                      <span className="font-medium tabular-nums">{slot.time}</span>
                      <span className="tabular-nums text-muted-foreground">{slot.covers}/{slot.capacity}</span>
                      <span className="absolute bottom-1 left-1.5 right-1.5 h-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", percentage >= 80 ? "bg-destructive" : percentage >= 50 ? "bg-warning" : "bg-success")}
                          style={{ width: `${percentage}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
