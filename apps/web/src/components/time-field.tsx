import { cn } from "cn";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";

interface TimeFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
}

const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));
const HOURS_24 = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const HOURS_12 = Array.from({ length: 12 }, (_, hour) => String(hour + 1));
const SELECT_CLASS = "h-10 min-w-0 bg-transparent px-1.5 text-sm tabular-nums outline-none focus-visible:rounded-sm focus-visible:bg-accent disabled:opacity-50 sm:h-8";

/** Browser-independent time control. Only HH:mm values reach state and the API. */
export function TimeField({ id, label, value, onChange, onBlur, disabled, className }: TimeFieldProps) {
  const t = useT();
  const format = useUiStore((state) => state.timeFormat);
  const valid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  const [hours, minutes] = valid ? value.split(":").map(Number) : [0, 0];
  const period = hours >= 12 ? "PM" : "AM";
  const hour = valid ? (format === "12h" ? String(hours % 12 || 12) : String(hours).padStart(2, "0")) : "";
  const minute = valid ? String(minutes).padStart(2, "0") : "";

  function change(nextHour: string, nextMinute: string, nextPeriod: string) {
    if (!nextHour || !nextMinute) return;
    const next24 = format === "12h"
      ? (Number(nextHour) % 12) + (nextPeriod === "PM" ? 12 : 0)
      : Number(nextHour);
    onChange(`${String(next24).padStart(2, "0")}:${nextMinute}`);
  }

  return (
    <div role="group" aria-label={label} className={cn("flex h-11 w-fit max-w-full items-center gap-1 rounded-md border border-input bg-background px-1 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 sm:h-9", className)}>
      <select
        id={id}
        aria-label={`${label} ${t("dates.time.hour")}`}
        className={cn(SELECT_CLASS, "w-[3.25rem]")}
        value={hour}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(e) => change(e.target.value, minute || "00", period)}
      >
        {!valid && <option value="">--</option>}
        {(format === "12h" ? HOURS_12 : HOURS_24).map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span aria-hidden="true" className="text-muted-foreground">:</span>
      <select
        aria-label={`${label} ${t("dates.time.minute")}`}
        className={cn(SELECT_CLASS, "w-[3.5rem]")}
        value={minute}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(e) => change(hour || (format === "12h" ? "12" : "00"), e.target.value, period)}
      >
        {!valid && <option value="">--</option>}
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      {format === "12h" && (
        <select
          aria-label={`${label} ${t("dates.time.period")}`}
          className={cn(SELECT_CLASS, "w-[4rem] border-l border-border pl-2")}
          value={period}
          disabled={disabled}
          onBlur={onBlur}
          onChange={(e) => change(hour || "12", minute || "00", e.target.value)}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      )}
    </div>
  );
}
