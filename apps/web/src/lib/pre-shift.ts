import type { FloorTable, PacingService, PacingSlot, Reservation, Table } from "@/lib/api";

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
 * A floor snapshot identifies which bookings hold tables at the selected instant.
 * Also include arrivals in that service's actual pacing slot (which may be 15, 30
 * or other minutes, and need not begin at a quarter-hour boundary).
 */
const minutesOf = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

function serviceSlot(time: string, slots: PacingSlot[]): [number, number] | null {
  const selected = minutesOf(time);
  for (let index = 0; index < slots.length; index++) {
    const start = minutesOf(slots[index].time);
    const next = slots[index + 1] && minutesOf(slots[index + 1].time);
    const previous = index > 0 ? minutesOf(slots[index - 1].time) : null;
    const interval = next !== undefined && next > start
      ? next - start
      : previous !== null && start > previous
        ? start - previous
        : 15;
    // Slots from the API are sorted within each service.
    if (selected >= start && selected < start + interval) return [start, start + interval];
  }
  return null;
}

export function rowsForFloorTime(
  rows: PreShiftRow[],
  selectedTime: string,
  floorTables: FloorTable[],
  pacing: PacingService[] = [],
): PreShiftRow[] {
  const reservedIds = new Set(
    floorTables
      .filter((table) => table.occupied && table.reservationId)
      .map((table) => table.reservationId),
  );
  const selected = minutesOf(selectedTime);
  const defaultStart = Math.floor(selected / 15) * 15;
  const byService = new Map(pacing.map((service) => [service.service, service.slots]));

  return rows.filter(({ reservation }) => {
    if (reservedIds.has(reservation.id)) return true;
    const [start, end] = serviceSlot(selectedTime, byService.get(reservation.service) ?? [])
      ?? [defaultStart, defaultStart + 15];
    const arrival = minutesOf(reservation.time);
    return arrival >= start && arrival < end;
  });
}

export function totalCovers(rows: PreShiftRow[]): number {
  return rows.reduce((sum, row) => sum + row.reservation.partySize, 0);
}
