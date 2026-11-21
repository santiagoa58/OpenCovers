import { ClipboardListIcon } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/stat";
import { PreShiftRowView } from "./pre-shift-row";
import { useT } from "@/i18n";
import { api, type FloorTable } from "@/lib/api";
import { buildPreShift, LARGE_PARTY_MIN, rowsForFloorTime, totalCovers } from "@/lib/pre-shift";
import { useAgenda } from "@/hooks/use-agenda";
import { usePacing } from "@/hooks/use-pacing";
import { useTables } from "@/hooks/use-tables";

import { longDate } from "@/lib/date";
import { parseReservationCommentary } from "@/lib/reservation-commentary";

import { useTimeDisplay } from "@/lib/time-format";

/** Contextual reservation details in the Floor plan; date and time come from the floor controls. */
export function PreShiftView({
  venueId,
  date,
  time,
  floorTables,
}: {
  venueId: string;
  date: string;
  time: string;
  floorTables: FloorTable[];
}) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const agenda = useAgenda(venueId, date);
  const pacing = usePacing(venueId, date);
  const tables = useTables(venueId);

  // The agenda contains only bookings whose arrival date matches the selected
  // date. A reservation arriving before midnight can still hold a table after
  // midnight, so fetch any floor reservation missing from today's agenda.
  const agendaReservations = agenda.data?.reservations ?? [];
  const agendaIds = new Set(agendaReservations.map((r) => r.id));
  const missingIds = [...new Set(
    floorTables
      .filter((table) => table.occupied && table.reservationId)
      .map((table) => table.reservationId as string),
  )].filter((id) => !agendaIds.has(id));
  const missingQueries = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: ["reservation", venueId, id],
      queryFn: () => api.getReservation(venueId, id),
      enabled: Boolean(agenda.data),
      retry: false,
      staleTime: 15_000,
    })),
  });
  const missingPending = Boolean(agenda.data) && missingQueries.some((query) => query.isPending);
  const missingError = missingQueries.find((query) => query.isError);
  const additionalReservations = missingQueries.flatMap((query) => query.data ? [query.data] : []);
  const rows = rowsForFloorTime(
    buildPreShift(
      [...agendaReservations, ...additionalReservations],
      tables.data?.tables ?? floorTables,
      null,
    ),
    time,
    floorTables,
    pacing.data?.pacing ?? [],
  );
  const largeCount = rows.filter((r) => r.large).length;
  const noteCount = rows.filter((r) => parseReservationCommentary(r.commentary).note !== null).length;
  const reservedIds = new Set(floorTables.filter((table) => table.occupied).map((table) => table.reservationId));

  return (
    <section
      aria-labelledby="floor-reservation-details-title"
      data-print-target="reservation-details"
      className="space-y-4 border-t pt-6 print:border-0 print:pt-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="floor-reservation-details-title" className="font-display text-2xl">{t("preshift.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground print:hidden">
            {t("preshift.subtitle")}
          </p>
          <p className="hidden text-sm print:block">
            {longDate(date)} · {displayTime(time)}
          </p>
        </div>
 
      </div>

      {agenda.isPending || missingPending ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : agenda.isError && !agenda.data ? (
        <LoadError
          what={t("preshift.loadWhat")}
          error={agenda.error}
          retrying={agenda.isRefetching}
          onRetry={() => void agenda.refetch()}
        />
      ) : missingError && rows.length === 0 ? (
        <LoadError
          what={t("preshift.loadWhat")}
          error={missingError.error}
          retrying={missingQueries.some((query) => query.isFetching)}
          onRetry={() => {
            for (const query of missingQueries) {
              if (query.isError) void query.refetch();
            }
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={t("preshift.empty.title")}
          description={t("preshift.empty.description")}
        />
      ) : (
        <>
          {missingError && (
            <LoadError
              what={t("preshift.loadWhat")}
              error={missingError.error}
              compact
              retrying={missingQueries.some((query) => query.isFetching)}
              onRetry={() => {
                for (const query of missingQueries) {
                  if (query.isError) void query.refetch();
                }
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border bg-card px-4 py-3 sm:grid-cols-4 print:hidden">
            <Stat variant="inline" label={t("preshift.stat.reservations")} value={rows.length} />
            <Stat variant="inline" label={t("preshift.stat.covers")} value={totalCovers(rows)} />
            <Stat variant="inline"
              label={t("preshift.stat.large", { min: LARGE_PARTY_MIN })}
              value={largeCount}
              tone={largeCount > 0 ? "warning" : "default"}
            />
            <Stat variant="inline" label={t("preshift.stat.notes")} value={noteCount} />
          </div>
          <p className="hidden text-sm print:block">
            {t("preshift.reservations", { count: rows.length })} ·{" "}
            {t("preshift.covers", { count: totalCovers(rows) })}
            {largeCount > 0 && ` · ${t("preshift.largeCount", { count: largeCount, min: LARGE_PARTY_MIN })}`}
          </p>

          <ul className="divide-y overflow-hidden rounded-xl border bg-card print:rounded-none print:border-x-0">
            {rows.map((row) => (
              <PreShiftRowView
                key={row.reservation.id}
                row={row}
                selectedDate={date}
                reservedAtTime={reservedIds.has(row.reservation.id)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

