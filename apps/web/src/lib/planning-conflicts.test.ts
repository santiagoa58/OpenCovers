import { describe, expect, it } from "vitest";
import type { Reservation, Table } from "@/lib/api";
import { bookingMinutes, planningConflicts } from "./planning-conflicts";
const table = (id: string): Table => ({ id, name: id, seats: 4, zone: "", shape: "round", posX: 0, posY: 0, rotation: 0 });
const booking = (id: string, time: string, tableId: string, status = "booked"): Reservation => ({
  id, venueId: "v1", date: "2026-11-21", time, partySize: 2, status, service: "dinner",
  version: 1, bookedVia: "staff", guest: { name: id }, tables: [tableId],
});
describe("planning conflicts", () => {
  const ninety = [{ upTo: 1000, minutes: 90 }];
  it("flags a 60-minute turnover that conflicts with a 90-minute seating, without moving either arrival", () => {
    const conflicts = planningConflicts([
      booking("A", "17:00", "10.1"), booking("B", "18:00", "10.1"),
    ], [table("10.1")], ninety);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ tableName: "10.1", overlapMinutes: 30 });
    expect(conflicts[0].earlier.time).toBe("17:00");
    expect(conflicts[0].later.time).toBe("18:00");
  });
  it("does not count a cancellation or different tables as a conflict", () => {
    expect(planningConflicts([
      booking("A", "17:00", "1"), booking("B", "17:30", "2"), booking("C", "17:45", "1", "cancelled"),
    ], [table("1"), table("2")], ninety)).toHaveLength(0);
  });
  it("respects precise boundary turns, party-specific durations, and nonadjacent overlaps", () => {
    const reservations = [booking("A", "17:00", "1"), booking("B", "17:30", "1"), booking("C", "18:00", "1"), booking("D", "18:30", "1")];
    expect(planningConflicts(reservations, [table("1")], ninety)).toHaveLength(6);
    expect(bookingMinutes([{ upTo: 2, minutes: 75 }, { upTo: 10, minutes: 120 }], 8)).toBe(120);
    expect(planningConflicts([booking("A", "17:00", "1"), booking("B", "18:30", "1")], [table("1")], ninety)).toHaveLength(0);
  });
});
