import { describe, expect, it } from "vitest";
import type { Reservation, Table } from "@/lib/api";
import { allocatedMinutes, bookingMinutes, peakSimultaneousParties, planningConflicts, tightTurnovers } from "./planning-conflicts";
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
    expect(planningConflicts(reservations, [table("1")], ninety)).toHaveLength(5);
    expect(bookingMinutes([{ upTo: 2, minutes: 75 }, { upTo: 10, minutes: 120 }], 8)).toBe(120);
    expect(planningConflicts([booking("A", "17:00", "1"), booking("B", "18:30", "1")], [table("1")], ninety)).toHaveLength(0);
  });
  it("detects when fixed arrival times require more tables than physically exist", () => {
    const guests = [
      booking("A", "17:00", "1"),
      booking("B", "17:15", "2"),
      booking("C", "17:30", "3"),
    ];
    expect(peakSimultaneousParties(guests, ninety)).toBe(3);
    expect(peakSimultaneousParties(guests, [{ upTo: 1000, minutes: 15 }])).toBe(1);
    expect(peakSimultaneousParties([...guests, booking("D", "17:45", "4", "cancelled")], ninety)).toBe(3);
  });

  it("uses the actual stored 60-minute allocation instead of incorrectly assuming 90", () => {
    const earlier = { ...booking("First", "17:00", "1"), durationMinutes: 60 };
    const later = { ...booking("Next", "18:00", "1"), durationMinutes: 90 };
    expect(allocatedMinutes(earlier, ninety)).toBe(60);
    expect(planningConflicts([earlier, later], [table("1")], ninety)).toHaveLength(0);
    expect(peakSimultaneousParties([earlier, later], ninety)).toBe(1);
    const turns = tightTurnovers([earlier, later], [table("1")], ninety);
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({ tableName: "1", earlier: { id: "First" }, later: { id: "Next" } });
  });

  it("does not mistake gaps or cancellations for a rushed reset", () => {
    const first = { ...booking("A", "17:00", "1"), durationMinutes: 60 };
    const gap = { ...booking("B", "18:15", "1"), durationMinutes: 90 };
    expect(tightTurnovers([first, gap, booking("X", "18:00", "1", "cancelled")], [table("1")], ninety)).toEqual([]);
  });

});
