import { z } from "zod";
import { MAX_ACTIVE_PER_GUEST_MAX, MAX_ADVANCE_DAYS_MAX, BLOCKED_DATES_MAX } from "../lib/booking-policy";
import { turnTimesSchema } from "../lib/turn-times";

/** Request shapes. Country codes, calendar ranges and policy rules are checked by existing domain utilities. */
const nonNegativeInteger = z.number().int().min(0);

export const venueConfigSchema = z.object({
  enabled: z.boolean().optional(),
  noticeAddress: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  resendApiKey: z.string().optional(),
  fromEmail: z.string().optional(),
  slotIntervalMinutes: nonNegativeInteger.optional(),
  leadTimeMinutes: nonNegativeInteger.optional(),
  lastSeatingOffsetMinutes: nonNegativeInteger.optional(),
  phoneCountry: z.string().nullable().optional(),
  turnTimes: turnTimesSchema.optional(),
  overbookingCeiling: nonNegativeInteger.max(1000).optional(),
  maxAdvanceDays: nonNegativeInteger.max(MAX_ADVANCE_DAYS_MAX).nullable().optional(),
  maxActivePerGuestPerDay: z.number().int().min(1).max(MAX_ACTIVE_PER_GUEST_MAX).nullable().optional(),
  blockedDates: z.array(z.union([
    z.string(),
    z.strictObject({ from: z.string(), to: z.string() }),
  ])).max(BLOCKED_DATES_MAX).optional(),
});

export const webhookCreateSchema = z.object({
  url: z.string(),
});
