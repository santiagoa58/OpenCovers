import { errorMessage } from "@/lib/error-message";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { canEditSetup, useNavigation } from "@/components/layout/navigation";
import { FloorToolbar } from "./floor-toolbar";
import { FloorRoom } from "./floor-room";
import { useUrlDate, useUrlTime } from "@/lib/url-state";
import { WalkInDialog } from "@/components/reservation/walk-in-dialog";
import { NewReservationDialog } from "@/components/reservation/new-reservation-dialog";
import { PlanningConflictsBanner } from "@/components/floor/planning-conflicts-banner";
import { FloorCanvas } from "@/components/floor/floor-canvas";
import { PacingView } from "@/components/pacing/pacing-view";
import { PreShiftView } from "@/components/preshift/pre-shift-view";
import { PrintReservationsDialog } from "@/components/printing/print-reservations-dialog";
import { MoveDialog } from "@/components/floor/move-dialog";
import { useFloor } from "@/hooks/use-floor";
import { useFloorItems } from "@/hooks/use-floor-items";
import { api, type FloorTable } from "@/lib/api";
import { useT } from "@/i18n";
import { nowTime, todayIso, venueNow } from "@/lib/date";

export function FloorView({ venueId, timezone }: { venueId: string; timezone?: string }) {
  const t = useT();
  const nav = useNavigation();
  const clock = timezone ? venueNow(timezone) : { date: todayIso(), time: nowTime() };
  const [date, setDate] = useUrlDate(clock.date);
  const [time, setTime] = useUrlTime(clock.time);
  const [bookingTable, setBookingTable] = useState<FloorTable | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [moveFrom, setMoveFrom] = useState<FloorTable | null>(null);
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, isRefetching, refetch } = useFloor(venueId, date, time);
  const { data: itemsData } = useFloorItems(venueId);
  // Snapshot occupancy and availability over the entire booking duration are different.
  const bookingAvailability = useQuery({
    queryKey: ["table-availability", venueId, date, time, 1],
    queryFn: () => api.getTableAvailability(venueId, date, time, 1),
  });

  const tables = data?.tables ?? [];
  const bookability = new Map((bookingAvailability.data?.tables ?? []).map((table) => [table.id, table.available]));
  const bookingTables = tables.map((table) => ({ ...table, bookable: bookability.get(table.id) }));
  const bookableCount = bookingAvailability.data ? bookingTables.filter((table) => table.bookable).length : null;
  const items = itemsData?.items ?? [];

  const occupied = tables.filter((t) => t.occupied).length;
  const free = tables.length - occupied;
  const seatedCovers = tables.reduce((n, t) => n + (t.occupied ? (t.partySize ?? 0) : 0), 0);

  const move = useMutation({
    mutationFn: ({ reservationId, targetTableId }: { reservationId: string; targetTableId: string }) =>
      api.modifyReservation(venueId, reservationId, { tables: [targetTableId] }),
    onSuccess: () => {
      toast.success(t("floor.moved"));
      void queryClient.invalidateQueries({ queryKey: ["floor", venueId] });
      void queryClient.invalidateQueries({ queryKey: ["agenda", venueId] });
      void queryClient.invalidateQueries({ queryKey: ["availability", venueId] });
    },
    onError: (err) => toast.error(errorMessage(err, t("floor.moveFailed"))),
    onSettled: () => setMoveFrom(null),
  });

  return (
    <div className="space-y-8 print:space-y-0">
      <FloorToolbar
        date={date}
        time={time}
        timezone={timezone}
        onDateChange={setDate}
        onTimeChange={setTime}
        onNewReservation={() => { setBookingTable(null); setBookingOpen(true); }}
        onWalkIn={() => setWalkInOpen(true)}
        onPrint={() => setPrintOpen(true)}
      />

      <div className="print:hidden">
        <PlanningConflictsBanner venueId={venueId} date={date} />
      </div>

      <div data-testid="floor-pacing" className="print:hidden">
        <PacingView venueId={venueId} date={date} time={time} onSelectTime={setTime} />
      </div>

      <FloorRoom
        time={time}
        tableCount={tables.length}
        free={free}
        occupied={occupied}
        covers={seatedCovers}
        bookableCount={bookableCount}
        availabilityError={bookingAvailability.isError}
        loading={isPending}
        loadFailed={isError && !data}
        error={error}
        retrying={isRefetching}
        onRetry={() => void refetch()}
        onAddTables={nav && canEditSetup(nav.role) ? () => nav.goTo("setup", "room") : undefined}
      >
        <FloorCanvas
          tables={bookingTables}
          items={items}
          mode="view"
          venueId={venueId}
          onSeat={(tableId) => {
            const table = tables.find((entry) => entry.id === tableId);
            if (!table) return;
            setBookingTable(table);
            setBookingOpen(true);
          }}
          onMove={(reservationId, targetTableId) =>
            move.mutate({ reservationId, targetTableId })
          }
          onMoveRequest={(tableId) => {
            const table = tables.find((entry) => entry.id === tableId);
            if (table?.reservationId) setMoveFrom(table);
          }}
        />
      </FloorRoom>

      {data && (
        <PreShiftView venueId={venueId} date={date} time={time} floorTables={tables} />
      )}

      {printOpen && (
        <PrintReservationsDialog
          venueId={venueId}
          date={date}
          initialScope="time"
          initialTime={time}
          floorTables={data?.tables}
          onClose={() => setPrintOpen(false)}
        />
      )}

      <MoveDialog
        source={moveFrom}
        tables={tables}
        pending={move.isPending}
        onMove={(reservationId, targetTableId) => move.mutate({ reservationId, targetTableId })}
        onClose={() => setMoveFrom(null)}
      />

      <NewReservationDialog
        venueId={venueId}
        date={date}
        time={time}
        partySize={Math.min(bookingTable?.seats ?? 2, 2)}
        initialTableId={bookingTable?.id}
        open={bookingOpen}
        onOpenChange={(open) => {
          setBookingOpen(open);
          if (!open) setBookingTable(null);
        }}
      />
      <WalkInDialog venueId={venueId} open={walkInOpen} onOpenChange={setWalkInOpen} />
    </div>
  );
}
