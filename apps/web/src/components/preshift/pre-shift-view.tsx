import { ClipboardListIcon, MessageSquareTextIcon, PrinterIcon, StarIcon } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { Pill, type PillTone } from "@/components/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgenda } from "@/hooks/use-agenda";
import { usePacing } from "@/hooks/use-pacing";
import { useTables } from "@/hooks/use-tables";
import { useT, type MessageKey } from "@/i18n";
import { api, type FloorTable, type Reconfirmation } from "@/lib/api";
import { longDate } from "@/lib/date";
import { buildPreShift, LARGE_PARTY_MIN, rowsForFloorTime, totalCovers, type PreShiftRow } from "@/lib/pre-shift";
import { useTimeDisplay } from "@/lib/time-format";

const RECONFIRMATION: Record<Exclude<Reconfirmation, "none">, { labelKey: MessageKey; tone: PillTone }> = {
  requested: { labelKey: "preshift.reconfirmation.requested", tone: "info" },
  confirmed: { labelKey: "preshift.reconfirmation.confirmed", tone: "success" },
  declined: { labelKey: "preshift.reconfirmation.declined", tone: "danger" },
  no_answer: { labelKey: "preshift.reconfirmation.noAnswer", tone: "warning" },
};

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
  const noteCount = rows.filter((r) => r.commentary).length;
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
        <Button
          variant="outline"
          className="print:hidden"
          disabled={agenda.isPending || missingPending || Boolean(missingError)}
          onClick={() => window.print()}
        >
          <PrinterIcon />
          {t("preshift.print")}
        </Button>
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
            <SummaryMetric label={t("preshift.stat.reservations")} value={rows.length} />
            <SummaryMetric label={t("preshift.stat.covers")} value={totalCovers(rows)} />
            <SummaryMetric
              label={t("preshift.stat.large", { min: LARGE_PARTY_MIN })}
              value={largeCount}
              warn={largeCount > 0}
            />
            <SummaryMetric label={t("preshift.stat.notes")} value={noteCount} />
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

function SummaryMetric({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-display text-2xl tabular-nums", warn && "text-warning")}>{value}</p>
    </div>
  );
}

function PreShiftRowView({ row, selectedDate, reservedAtTime }: { row: PreShiftRow; selectedDate: string; reservedAtTime: boolean }) {
  const t = useT();
  const { reservation, tableNames, large, commentary } = row;
  const displayTime = useTimeDisplay();
  return (
    <li
      data-slot="preshift-row"
      className={cn(
        "grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-l-4 border-l-transparent px-4 py-3 md:grid-cols-[4rem_minmax(0,13rem)_6rem_8rem_minmax(0,1fr)] md:items-start md:gap-x-4 print:break-inside-avoid print:py-2",
        large && "border-l-warning",
      )}
    >
      <div>
        <div className="font-display text-xl tabular-nums">{displayTime(reservation.time)}</div>
        {reservation.date !== selectedDate && (
          <p className="text-xs text-muted-foreground">{longDate(reservation.date)}</p>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium">{reservation.guest.name || "—"}</div>
        <div className="text-xs text-muted-foreground">
          {t(reservedAtTime ? "preshift.reservedAtTime" : "preshift.arrivingInSlot")}
        </div>
        {reservation.guest.contact && (
          <div className="truncate text-xs text-muted-foreground">{reservation.guest.contact}</div>
        )}
      </div>
      <div className="col-span-2 col-start-1 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[calc(3.5rem+0.75rem)] md:contents">
        <div>
          {large ? (
            <Pill tone="warning" className="tabular-nums">
              {t("preshift.large", { count: reservation.partySize })}
            </Pill>
          ) : (
            <span className="text-sm tabular-nums">
              <span className="sr-only">{t("common.partyOf", { count: reservation.partySize })}</span>
              <span aria-hidden="true">{reservation.partySize}</span>
            </span>
          )}
        </div>
        <div className="text-sm">
          {tableNames.length > 0 ? (
            tableNames.join(", ")
          ) : (
            <Pill tone="danger">{t("preshift.unassigned")}</Pill>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:basis-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span data-slot="reconfirmation">
              <ReconfirmationPill value={reservation.reconfirmation} />
            </span>
            {reservation.rating ? (
              <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                <StarIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("preshift.rating", { rating: reservation.rating })}</span>
                <span aria-hidden="true">{reservation.rating}</span>
              </span>
            ) : null}
          </div>
          {commentary && (
            <p
              data-slot="booking-note"
              className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {commentary}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function ReconfirmationPill({ value }: { value: Reconfirmation | undefined }) {
  const t = useT();
  if (!value || value === "none") return null;
  const r = RECONFIRMATION[value];
  return <Pill tone={r.tone}>{t(r.labelKey)}</Pill>;
}

