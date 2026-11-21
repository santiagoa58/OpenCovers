import { describe, expect, it } from "vitest";
import { floorItemSchema, serviceSchema, tableLayoutSchema, tableSchema } from "../src/http/room-schemas";
import { venueConfigSchema, webhookCreateSchema } from "../src/http/venue-settings-schemas";
import { staffReservationSchema, staffWalkInSchema, staffModifySchema, staffStatusSchema, staffWaitlistSchema } from "../src/http/staff-reservation-schemas";
import { parseDays } from "../src/lib/catalog";
import { parseTurnTimes } from "../src/lib/turn-times";

describe("request schemas", () => {
  it("rejects malformed or unexpected staff reservation fields instead of silently dropping them", () => {
    const valid = { date: "2026-11-22", time: "19:00", partySize: 2 };
    expect(staffReservationSchema.safeParse(valid).success).toBe(true);
    expect(staffReservationSchema.safeParse({ ...valid, tables: ["1"], guest: { name: "Ana", consent: "granted" } }).success).toBe(true);
    for (const body of [
      null,
      {},
      { ...valid, partySize: "2" },
      { ...valid, tables: "1" },
      { ...valid, guest: null },
      { ...valid, guest: { name: "Ana", consent: null } },
      { ...valid, guest: { name: "Ana", extra: "ignored before" } },
      { ...valid, zone: 5 },
      { ...valid, unknownField: true },
    ]) {
      expect(staffReservationSchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
    }
    expect(staffWalkInSchema.safeParse({ partySize: 2, tables: ["2"] }).success).toBe(true);
    expect(staffWalkInSchema.safeParse({ partySize: 2, tables: "2" }).success).toBe(false);
    expect(staffWaitlistSchema.safeParse({ partySize: 2, guest: { name: "Ana" } }).success).toBe(true);
    expect(staffWaitlistSchema.safeParse({ partySize: 2, guest: { name: null } }).success).toBe(false);
    expect(staffModifySchema.safeParse({ tables: ["1"], guest: { name: "Ana" } }).success).toBe(true);
    expect(staffModifySchema.safeParse({ tables: "1" }).success).toBe(false);
    expect(staffStatusSchema.safeParse({ status: "seated" }).success).toBe(true);
    expect(staffStatusSchema.safeParse({ status: null }).success).toBe(false);
  });

  it("checks table and layout input without coercing malformed values", () => {
    expect(tableSchema.safeParse({ id: "1", name: "T1", seats: 2 }).success).toBe(true);
    expect(tableSchema.safeParse({ id: "1", name: "T1", seats: "2" }).success).toBe(false);
    expect(tableSchema.safeParse({ id: "1", name: "T1", seats: 0 }).success).toBe(false);
    expect(tableSchema.safeParse({ id: "1", name: "T1", seats: 2, seets: 3 }).success).toBe(false);
    expect(tableLayoutSchema.safeParse({ x: 10, extra: 1 }).success).toBe(false);
    expect(tableLayoutSchema.safeParse({ x: 100, rotation: 90 }).success).toBe(true);
    expect(tableLayoutSchema.safeParse({ x: "100" }).success).toBe(false);
    expect(floorItemSchema.safeParse({ type: "wall", posX: 20 }).success).toBe(true);
    expect(floorItemSchema.safeParse({ type: "" }).success).toBe(false);
  });

  it("uses a plain schema for service fields and existing domain rules for weekdays", () => {
    const parsed = serviceSchema.safeParse({
      name: "dinner",
      openStart: "17:00",
      openEnd: "22:00",
      days: [7, 1],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parseDays(parsed.data.days)).toEqual([1, 7]);
    expect(parseDays([1, 1])).toBeNull();
    expect(serviceSchema.safeParse({ name: "dinner", openStart: "17:00", openEnd: "22:00", days: [8] }).success).toBe(false);
  });

  it("checks venue settings structure without embedding booking-policy refinements", () => {
    expect(venueConfigSchema.safeParse({ enabled: true, leadTimeMinutes: 30 }).success).toBe(true);
    expect(venueConfigSchema.safeParse({ leadTimeMinutes: "30" }).success).toBe(false);
    expect(venueConfigSchema.safeParse({ leadTimMinutes: 30 }).success).toBe(false);
    expect(venueConfigSchema.safeParse({ blockedDates: null }).success).toBe(false);
    expect(venueConfigSchema.safeParse({ blockedDates: [] }).success).toBe(true);
    expect(venueConfigSchema.safeParse({ turnTimes: null }).success).toBe(false);
    expect(venueConfigSchema.safeParse({ turnTimes: [] }).success).toBe(true);
    expect(venueConfigSchema.safeParse({ maxAdvanceDays: 1001 }).success).toBe(false);
    expect(venueConfigSchema.safeParse({ blockedDates: ["2026-11-21", { from: "2026-11-22", to: "2026-11-23" }] }).success).toBe(true);
    expect(venueConfigSchema.safeParse({ blockedDates: [{ from: "2026-11-22" }] }).success).toBe(false);
    expect(webhookCreateSchema.safeParse({ url: "https://example.com/hook" }).success).toBe(true);
    expect(webhookCreateSchema.safeParse({ url: 123 }).success).toBe(false);
  });

  it("separates turn-time shape checking from ordered party-size thresholds", () => {
    expect(parseTurnTimes([{ upTo: 2, minutes: 90 }, { upTo: 4, minutes: 120 }])).toEqual([
      { upTo: 2, minutes: 90 },
      { upTo: 4, minutes: 120 },
    ]);
    expect(parseTurnTimes([{ upTo: 4, minutes: 90 }, { upTo: 2, minutes: 120 }])).toBeNull();
    expect(parseTurnTimes([{ upTo: "2", minutes: 90 }])).toBeNull();
    expect(parseTurnTimes([{ upTo: 2, minutes: 90, extra: true }])).toBeNull();
  });
});
