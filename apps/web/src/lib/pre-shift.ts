import type { FloorTable, Reservation, Table } from "@/lib/api";

export const LARGE_PARTY_MIN = 6;

const UPCOMING = new Set(["booked", "seated"]);

export interface PreShiftRow {
  reservation: Reservation;
  tableNames: string[];
  large: boolean;
  commentary: string | null;
}

function commentaryOf(reservation: Reservation): string | null {
  const note = reservation.commentary?.trim();
  return note ? note : null;
}

export function buildPreShift(
  reservations: Reservation[],
  tables: Table[],
  service: string | null,
): PreShiftRow[] {
  const names = new Map(tables.map((t) => [t.id, t.name]));
  return reservations
    .filter((r) => UPCOMING.has(r.status) && (service === null || r.service === service))
    .map((reservation) => ({
      reservation,
      tableNames: (reservation.tables ?? []).map((id) => names.get(id) ?? id),
      large: reservation.partySize >= LARGE_PARTY_MIN,
      commentary: commentaryOf(reservation),
    }))
    .sort((a, b) => a.reservation.time.localeCompare(b.reservation.time));
}

/**
 * The same selected time drives the floor and its Pre-shift details.
 * Show reservations occupying a table in the floor snapshot, plus arrivals in
 * the selected 15-minute pacing slot (including those still unassigned).
 * Using the floor snapshot avoids assuming a fixed dining duration.
 */
export function rowsForFloorTime(
  rows: PreShiftRow[],
  selectedTime: string,
  floorTables: FloorTable[],
): PreShiftRow[] {
  const occupiedIds = new Set(
    floorTables
      .filter((table) => table.occupied && table.reservationId)
      .map((table) => table.reservationId),
  );
  const [hours, minutes] = selectedTime.split(":").map(Number);
  const slotStart = Math.floor((hours * 60 + minutes) / 15) * 15;

  return rows.filter(({ reservation }) => {
    if (occupiedIds.has(reservation.id)) return true;
    const [hour, minute] = reservation.time.split(":").map(Number);
    const arrival = hour * 60 + minute;
    return arrival >= slotStart && arrival < slotStart + 15;
  });
}

export function totalCovers(rows: PreShiftRow[]): number {
  return rows.reduce((sum, row) => sum + row.reservation.partySize, 0);
}
