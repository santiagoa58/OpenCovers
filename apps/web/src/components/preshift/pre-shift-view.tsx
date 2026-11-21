import { ClipboardListIcon, MessageSquareTextIcon, PrinterIcon, StarIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { Pill, type PillTone } from "@/components/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/stat";
import { useAgenda } from "@/hooks/use-agenda";
import { useTables } from "@/hooks/use-tables";
import { useT, type MessageKey } from "@/i18n";
import type { FloorTable, Reconfirmation } from "@/lib/api";
import { longDate } from "@/lib/date";
import { buildPreShift, LARGE_PARTY_MIN, rowsForFloorTime, totalCovers, type PreShiftRow } from "@/lib/pre-shift";
import { useTimeDisplay } from "@/lib/time-format";

const RECONFIRMATION: Record<Exclude<Reconfirmation, "none">, { labelKey: MessageKey; tone: PillTone }> = {
  requested: { labelKey: "preshift.reconfirmation.requested", tone: "info" },
  confirmed: { labelKey: "preshift.reconfirmation.confirmed", tone: "success" },
  declined: { labelKey: "preshift.reconfirmation.declined", tone: "danger" },
  no_answer: { labelKey: "preshift.reconfirmation.noAnswer", tone: "warning" },
};

/** Contextual Pre-shift section of the Floor plan; date and time come from the floor controls. */
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
  const tables = useTables(venueId);

  const rows = rowsForFloorTime(
    buildPreShift(agenda.data?.reservations ?? [], tables.data?.tables ?? [], null),
    time,
    floorTables,
  );
  const largeCount = rows.filter((r) => r.large).length;
  const noteCount = rows.filter((r) => r.commentary).length;

  return (
    <section aria-labelledby="floor-pre-shift-title" className="space-y-4 border-t pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="floor-pre-shift-title" className="font-display text-2xl">{t("preshift.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="first-letter:uppercase">{longDate(date)}</span>
            {" · "}{displayTime(time)} · {t("preshift.subtitle")}
          </p>
        </div>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
          <PrinterIcon />
          {t("preshift.print")}
        </Button>
      </div>

      {agenda.isPending ? (
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={t("preshift.empty.title")}
          description={t("preshift.empty.description")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
            <Stat label={t("preshift.stat.reservations")} value={rows.length} />
            <Stat label={t("preshift.stat.covers")} value={totalCovers(rows)} />
            <Stat
              label={t("preshift.stat.large", { min: LARGE_PARTY_MIN })}
              value={largeCount}
              tone={largeCount > 0 ? "warning" : "default"}
            />
            <Stat label={t("preshift.stat.notes")} value={noteCount} />
          </div>
          <p className="hidden text-sm print:block">
            {t("preshift.reservations", { count: rows.length })} ·{" "}
            {t("preshift.covers", { count: totalCovers(rows) })}
            {largeCount > 0 && ` · ${t("preshift.largeCount", { count: largeCount, min: LARGE_PARTY_MIN })}`}
          </p>

          <ul className="divide-y overflow-hidden rounded-xl border bg-card print:rounded-none print:border-x-0">
            {rows.map((row) => (
              <PreShiftRowView key={row.reservation.id} row={row} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function PreShiftRowView({ row }: { row: PreShiftRow }) {
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
      <div className="font-display text-xl tabular-nums">{displayTime(reservation.time)}</div>
      <div className="min-w-0">
        <div className="truncate font-medium">{reservation.guest.name || "—"}</div>
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
            {(reservation.guest.consent === "granted" || reservation.guest.consent === "denied") && (
              <Pill tone={reservation.guest.consent === "granted" ? "success" : "muted"}>
                {t(`common.consent.${reservation.guest.consent}`)}
              </Pill>
            )}
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

