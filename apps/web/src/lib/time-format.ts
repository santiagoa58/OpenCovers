import { useUiStore, type TimeFormat } from "@/stores/ui-store";
import { dateTime } from "@/lib/date";

/** Human-readable clock time; reservation APIs keep the original HH:mm value. */
export function formatClockTime(time: string, format: TimeFormat): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time);
  if (!match || format === "24h") return time;
  const hour = Number(match[1]);
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${match[2]}${match[3] ? `:${match[3]}` : ""} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatClockRange(start: string, end: string, format: TimeFormat): string {
  return `${formatClockTime(start, format)}–${formatClockTime(end, format)}`;
}

/** Subscribes a screen to changes in the display preference. */
export function useTimeDisplay(): (time: string) => string {
  const format = useUiStore((state) => state.timeFormat);
  return (time: string) => formatClockTime(time, format);
}

/** Formats timestamps using the same time preference as clock labels. */
export function useDateTimeDisplay(): (iso: string, options?: Intl.DateTimeFormatOptions) => string {
  const format = useUiStore((state) => state.timeFormat);
  return (iso, options) => dateTime(iso, { ...options, hour12: format === "12h" });
}
