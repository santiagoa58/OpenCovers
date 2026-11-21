import type { Failure, PublicSlot } from "./api";
import type { Translate } from "./messages";
import { secondaryButton } from "./ui";
import { groupSlots, zonesToShow } from "./zones";

export type Times =
  | { kind: "pick-date" }
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "loaded"; times: string[]; slots: PublicSlot[] | null; reason: "past_date" | "beyond_horizon" | null }
  | { kind: "failed"; failure: Failure };

// `hidden`: the days route failed or is limited, so the form works from the date field alone.
const chipClass =
  "inline-flex min-h-11 min-w-16 flex-col items-center justify-center rounded-oc border border-border bg-surface " +
  "px-3 py-1 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary " +
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary";

export function TimeList(props: {
  times: Times;
  t: Translate;
  party: number;
  name: string;
  value: string;
  zone?: string;
  onChange(value: string): void;
  explain(failure: Failure): string;
  onRetry?(): void;
}) {
  const { times, t } = props;
  const chosenZone = props.zone ?? "";
  if (times.kind === "pick-date") return <p className="text-muted">{t("times.pickDate")}</p>;
  if (times.kind === "closed") return <p role="status">{t("times.closed")}</p>;
  if (times.kind === "loading") return <p role="status">{t("times.loading")}</p>;
  if (times.kind === "failed") {
    return (
      <div className="space-y-2">
        <p role="status">{props.explain(times.failure)}</p>
        {props.onRetry && (
          <button type="button" className={secondaryButton} onClick={props.onRetry}>
            {t("action.retry")}
          </button>
        )}
      </div>
    );
  }
  if (times.times.length === 0) {
    if (times.reason === "past_date") return <p role="status">{t("times.pastDate")}</p>;
    if (times.reason === "beyond_horizon") return <p role="status">{t("times.tooFar")}</p>;
    return <p role="status">{t("times.none", { n: props.party })}</p>;
  }
  const slots: PublicSlot[] = times.slots ?? times.times.map((time) => ({ time }));
  const groups = groupSlots(slots);
  const chips = (list: PublicSlot[]) => (
    <div className="flex flex-wrap gap-2">
      {list.map((slot) => {
        const shown = zonesToShow(slot, chosenZone);
        const zoneText = shown.join(", ");
        return (
          <label key={slot.time} className="group relative">
            <input
              type="radio"
              name={props.name}
              value={slot.time}
              checked={props.value === slot.time}
              onChange={() => props.onChange(slot.time)}
              aria-label={zoneText ? t("times.withZones", { time: slot.time, zones: zoneText }) : undefined}
              className="peer absolute inset-0 opacity-0"
            />
            <span className={chipClass}>
              <span>{slot.time}</span>
              {zoneText && <span className="text-xs text-muted group-has-[:checked]:text-on-primary">{zoneText}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
  if (groups.length === 1 && groups[0].service === null) return chips(slots);
  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <div key={`${index}-${group.service}`} role="group" aria-label={group.service || undefined} className="space-y-1">
          {group.service && <p className="text-sm font-medium text-muted [overflow-wrap:anywhere]">{group.service}</p>}
          {chips(group.slots)}
        </div>
      ))}
    </div>
  );
}

