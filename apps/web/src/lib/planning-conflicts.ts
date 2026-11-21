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
