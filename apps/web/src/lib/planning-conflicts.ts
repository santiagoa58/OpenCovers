import type { Reservation, Table } from "@/lib/api";

/** Potential overlaps when the existing reservations are evaluated using a target seating duration.
 * The app does not silently extend stored reservations when the venue's duration setting changes. */
export interface PlanningConflict {
  tableId: string;
  tableName: string;
  earlier: Reservation;
  later: Reservation;
  overlapMinutes: number;
}
const ACTIVE = new Set(["booked", "seated"]);
function toMinutes(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}
export function bookingMinutes(turnTimes: { upTo: number; minutes: number }[] | undefined, partySize: number): number {
  if (!turnTimes?.length) return 120;
  return (turnTimes.find((rule) => rule.upTo >= partySize) ?? turnTimes[turnTimes.length - 1]).minutes;
}

export function planningConflicts(
  reservations: Reservation[],
  tables: Table[],
  turnTimes: { upTo: number; minutes: number }[] | undefined,
): PlanningConflict[] {
  const names = new Map(tables.map((table) => [table.id, table.name]));
  const byTable = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    if (!ACTIVE.has(reservation.status)) continue;
    for (const table of reservation.tables ?? []) {
      const entries = byTable.get(table) ?? [];
      entries.push(reservation);
      byTable.set(table, entries);
    }
  }
  const result: PlanningConflict[] = [];
  for (const [tableId, entries] of byTable) {
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    for (let i = 0; i < entries.length; i++) {
      const current = entries[i];
      const start = toMinutes(current.time);
      const end = start + bookingMinutes(turnTimes, current.partySize);
      for (let j = i + 1; j < entries.length; j++) {
        const later = entries[j];
        const dayOffset = Math.round((Date.parse(later.date + "T00:00:00Z") - Date.parse(current.date + "T00:00:00Z")) / 60000);
        const laterStart = dayOffset + toMinutes(later.time);
        if (laterStart >= end) break;
        result.push({
          tableId,
          tableName: names.get(tableId) ?? tableId,
          earlier: current,
          later,
          overlapMinutes: end - laterStart,
        });
      }
    }
  }
  return result.sort((a, b) => a.later.time.localeCompare(b.later.time) || a.tableName.localeCompare(b.tableName));
}

// Counts simultaneous parties, not guests: a venue cannot seat more separate parties than tables
// without explicitly agreed table sharing, even if the total guest count is below seat capacity.
export function peakSimultaneousParties(
  reservations: Reservation[],
  turnTimes: { upTo: number; minutes: number }[] | undefined,
): number {
  const active = reservations.filter((r) => ACTIVE.has(r.status));
  if (!active.length) return 0;
  const firstDate = active.reduce((min, r) => r.date < min ? r.date : min, active[0].date);
  const origin = Date.parse(firstDate + "T00:00:00Z");
  const events: { minute: number; delta: number }[] = [];
  for (const reservation of active) {
    const day = Math.round((Date.parse(reservation.date + "T00:00:00Z") - origin) / 60000);
    const start = day + toMinutes(reservation.time);
    events.push({ minute: start, delta: 1 }, { minute: start + bookingMinutes(turnTimes, reservation.partySize), delta: -1 });
  }
  // An end at 18:00 does not overlap a new reservation starting at 18:00.
  events.sort((a, b) => a.minute - b.minute || a.delta - b.delta);
  let count = 0;
  let peak = 0;
  for (const event of events) {
    count += event.delta;
    peak = Math.max(peak, count);
  }
  return peak;
}
