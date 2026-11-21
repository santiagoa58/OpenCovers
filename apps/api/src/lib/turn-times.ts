import { z } from "zod";

export interface TurnTime {
  upTo: number;
  minutes: number;
}

export const DEFAULT_DURATION_MINUTES = 120;
export const TURN_MINUTES_MIN = 15;
export const TURN_MINUTES_MAX = 480;
export const TURN_TIMES_MAX_ROWS = 10;

export function turnMinutes(turnTimes: TurnTime[], partySize: number): number {
  if (turnTimes.length === 0) return DEFAULT_DURATION_MINUTES;
  return (turnTimes.find((t) => t.upTo >= partySize) ?? turnTimes[turnTimes.length - 1]).minutes;
}

/** Validate the complete schedule, including ascending, non-overlapping party-size thresholds. */
export const turnTimesSchema = z.array(
  z.strictObject({
    upTo: z.number().int().min(1),
    minutes: z.number().int().min(TURN_MINUTES_MIN).max(TURN_MINUTES_MAX),
  }),
)
  .max(TURN_TIMES_MAX_ROWS)
  .refine((rows) => rows.every((row, index) => index === 0 || row.upTo > rows[index - 1].upTo));

/** Preserve the existing null-on-invalid contract for the booking engine and stored settings. */
export function parseTurnTimes(value: unknown): TurnTime[] | null {
  const parsed = turnTimesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
