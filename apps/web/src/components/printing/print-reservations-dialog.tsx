import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TimeField } from "@/components/time-field";
import { LoadError } from "@/components/load-error";
import { useAgenda } from "@/hooks/use-agenda";
import { useTables } from "@/hooks/use-tables";
import { useT, type MessageKey } from "@/i18n";
import { api, type FloorTable, type Reconfirmation } from "@/lib/api";
import { longDate, nowTime } from "@/lib/date";
import { buildPreShift, buildReservationRows, rowsForFloorTime, totalCovers, type PreShiftRow } from "@/lib/pre-shift";
import { useTimeDisplay } from "@/lib/time-format";

type PrintScope = "day" | "service" | "time";
const EXCLUDED = new Set(["cancelled", "no_show"]);

const RECONFIRMATION: Partial<Record<Reconfirmation, MessageKey>> = {
  requested: "preshift.reconfirmation.requested",
  confirmed: "preshift.reconfirmation.confirmed",
  declined: "preshift.reconfirmation.declined",
  no_answer: "preshift.reconfirmation.noAnswer",
};

function exitPrintMode() {
  document.body.classList.remove("reservation-print-active");
  window.removeEventListener("afterprint", exitPrintMode);
}

/**
 * One print flow on Agenda and Floor plan. Reports are rendered in a dedicated
 * body-level print root; the page, floor canvas, charts and modal never print.
 */
export function PrintReservationsDialog({
  venueId,
  date,
  initialScope = "day",
  initialTime,
  floorTables,
  onClose,
}: {
  venueId: string;
  date: string;
  initialScope?: PrintScope;
  initialTime?: string;
  floorTables?: FloorTable[];
  onClose: () => void;
}) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const [scope, setScope] = useState<PrintScope>(initialScope);
  const [time, setTime] = useState(initialTime ?? nowTime);
  const [service, setService] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);

  useEffect(() => () => exitPrintMode(), []);

  const agenda = useAgenda(venueId, date);
  const tables = useTables(venueId);
  const services = [...new Set((agenda.data?.reservations ?? []).map((r) => r.service))];
  const selectedService = services.includes(service) ? service : (services[0] ?? "");
  const originalSnapshot = scope === "time" && floorTables !== undefined && time === initialTime;
  const floor = useQuery({
    queryKey: ["floor", venueId, date, time],
    queryFn: () => api.getFloorPlan(venueId, date, time),
    enabled: scope === "time" && !originalSnapshot,
  });
  const pacing = useQuery({
    queryKey: ["pacing", venueId, date],
    queryFn: () => api.getPacing(venueId, date),
    enabled: scope === "time",
  });
  const snapshotReady = scope !== "time" || originalSnapshot || Boolean(floor.data);
  const snapshotTables = originalSnapshot ? (floorTables ?? []) : (floor.data?.tables ?? []);
  const agendaReservations = agenda.data?.reservations ?? [];
  const agendaIds = new Set(agendaReservations.map((r) => r.id));
  const missingIds = scope === "time" && snapshotReady
    ? [...new Set(snapshotTables
      .filter((table) => table.occupied && table.reservationId)
      .map((table) => table.reservationId as string))]
      .filter((id) => !agendaIds.has(id))
    : [];

  // The selected snapshot can still hold a previous day's reservation.
  const missing = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: ["reservation", venueId, id],
      queryFn: () => api.getReservation(venueId, id),
      enabled: Boolean(agenda.data),
      retry: false,
      staleTime: 15_000,
    })),
  });

  const missingReservations = missing.flatMap((query) => query.data ? [query.data] : []);
  const sourceTables = tables.data?.tables ?? snapshotTables;
  const rows = scope === "time"
    ? rowsForFloorTime(
      buildPreShift([...agendaReservations, ...missingReservations], sourceTables, null),
      time,
      snapshotTables,
      pacing.data?.pacing ?? [],
    )
    : buildReservationRows(
      agendaReservations.filter((r) =>
        (scope !== "service" || r.service === selectedService) &&
        (includeInactive || !EXCLUDED.has(r.status))),
      sourceTables,
    );

  const loading = agenda.isPending || tables.isPending ||
    (scope === "time" && ((!originalSnapshot && floor.isPending) || pacing.isPending || missing.some((query) => query.isPending)));
  const firstError =
    (agenda.isError && !agenda.data ? agenda.error : null) ||
    (tables.isError && !tables.data ? tables.error : null) ||
    (scope === "time" && !originalSnapshot && floor.isError && !floor.data ? floor.error : null) ||
    (scope === "time" && pacing.isError && !pacing.data ? pacing.error : null) ||
    (scope === "time" ? missing.find((query) => query.isError)?.error : null);

  const ready = !loading && !firstError && rows.length > 0;
  const summary = scope === "time"
    ? t("preshift.print.rangeTime", { time: displayTime(time) })
    : scope === "service"
      ? t("preshift.print.rangeService", { service: selectedService })
      : t("preshift.print.rangeDay");

  function handlePrint() {
    if (!ready) return;
    document.body.classList.add("reservation-print-active");
    window.addEventListener("afterprint", exitPrintMode, { once: true });
    try {
      window.print();
    } catch (error) {
      exitPrintMode();
      throw error;
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-xl" aria-describedby="reservation-print-description">
          <DialogHeader>
            <DialogTitle>{t("preshift.print.dialogTitle")}</DialogTitle>
            <DialogDescription id="reservation-print-description">
              {t("preshift.print.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2" aria-label={t("preshift.print.scope")}>
            <legend className="text-sm font-medium">{t("preshift.print.scope")}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["day", "service", "time"] as const).map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <input
                    type="radio"
                    name="reservation-print-scope"
                    checked={scope === option}
                    onChange={() => setScope(option)}
                    className="accent-primary"
                  />
                  {t(option === "day" ? "preshift.print.day" : option === "service" ? "preshift.print.serviceOnly" : "preshift.print.atTime")}
                </label>
              ))}
            </div>
          </fieldset>

          {scope === "service" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t("preshift.print.serviceLabel")}</span>
              <select
                aria-label={t("preshift.print.serviceLabel")}
                className="h-11 rounded-md border border-input bg-background px-3 sm:h-9"
                value={selectedService}
                onChange={(event) => setService(event.target.value)}
              >
                {services.map((name) => <option key={name} value={name}>{name || t("agenda.service")}</option>)}
              </select>
            </label>
          )}

          {scope === "time" && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("preshift.print.timeLabel")}</p>
              <TimeField label={t("preshift.print.timeLabel")} value={time} onChange={setTime} />
            </div>
          )}

          <div className="space-y-2 text-sm">
            {scope !== "time" && (
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="size-4 accent-primary" />
                {t("preshift.print.includeInactive")}
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} className="size-4 accent-primary" />
              {t("preshift.print.includeNotes")}
            </label>
          </div>

          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm" aria-live="polite">
            <p className="font-medium">{t("preshift.print.preview")}</p>
            <p className="mt-1 text-muted-foreground">{longDate(date)} · {summary}</p>
            {loading ? (
              <p className="mt-1">{t("common.loading")}</p>
            ) : firstError ? (
              <LoadError
                compact
                what={t("preshift.loadWhat")}
                error={firstError}
                retrying={agenda.isRefetching || tables.isRefetching || floor.isRefetching || pacing.isRefetching}
                onRetry={() => {
                  if (agenda.isError) void agenda.refetch();
                  if (tables.isError) void tables.refetch();
                  if (floor.isError) void floor.refetch();
                  if (pacing.isError) void pacing.refetch();
                  for (const query of missing) if (query.isError) void query.refetch();
                }}
              />
            ) : rows.length === 0 ? (
              <p className="mt-1 text-muted-foreground">{t("preshift.print.noResults")}</p>
            ) : (
              <p className="mt-1 tabular-nums">
                {t("preshift.reservations", { count: rows.length })} · {t("preshift.covers", { count: totalCovers(rows) })}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button disabled={!ready} onClick={handlePrint}>
              <PrinterIcon className="size-4" />
              {t("preshift.print.printList")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createPortal(
        <ReservationPrintSheet
          date={date}
          range={summary}
          rows={rows}
          includeNotes={includeNotes}
        />,
        document.body,
      )}
    </>
  );
}

function ReservationPrintSheet({
  date,
  range,
  rows,
  includeNotes,
}: {
  date: string;
  range: string;
  rows: PreShiftRow[];
  includeNotes: boolean;
}) {
  const t = useT();
  const displayTime = useTimeDisplay();
  return (
    <section data-reservation-print-root className="hidden print:block" aria-label={t("preshift.print.reportTitle")}>
      <header className="mb-5 border-b pb-3">
        <h1 className="text-2xl font-bold">{t("preshift.print.reportTitle")}</h1>
        <p className="mt-1 text-sm">{longDate(date)} · {range}</p>
        <p className="mt-1 text-sm">
          {t("preshift.reservations", { count: rows.length })} · {t("preshift.covers", { count: totalCovers(rows) })}
        </p>
      </header>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-2">{t("preshift.print.colTime")}</th>
            <th className="py-2 pr-2">{t("preshift.print.colGuest")}</th>
            <th className="py-2 pr-2">{t("preshift.print.colGuests")}</th>
            <th className="py-2 pr-2">{t("preshift.print.colTables")}</th>
            <th className="py-2">{t("preshift.print.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ reservation, tableNames, commentary }) => {
            const reconfirmation = reservation.reconfirmation && RECONFIRMATION[reservation.reconfirmation];
            const status: Record<string, MessageKey> = {
              booked: "common.status.booked",
              seated: "common.status.seated",
              attended: "common.status.attended",
              cancelled: "common.status.cancelled",
              no_show: "common.status.noShow",
            };
            return (
              <tr key={reservation.id} className="border-b align-top">
                <td className="py-2 pr-2 whitespace-nowrap tabular-nums">{displayTime(reservation.time)}</td>
                <td className="py-2 pr-2">
                  <span className="font-semibold">{reservation.guest.name || "—"}</span>
                  {reservation.date !== date && <span className="block text-xs">{longDate(reservation.date)}</span>}
                  {reservation.guest.contact && <span className="block text-xs">{reservation.guest.contact}</span>}
                  {includeNotes && commentary && <span className="mt-1 block text-xs">{t("preshift.print.note", { note: commentary })}</span>}
                </td>
                <td className="py-2 pr-2 tabular-nums">{reservation.partySize}</td>
                <td className="py-2 pr-2">{tableNames.length ? tableNames.join(", ") : t("preshift.unassigned")}</td>
                <td className="py-2">
                  {status[reservation.status] ? t(status[reservation.status]) : reservation.status}
                  {reconfirmation && <span className="mt-1 block text-xs">{t("preshift.print.reconfirmation", { status: t(reconfirmation) })}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
