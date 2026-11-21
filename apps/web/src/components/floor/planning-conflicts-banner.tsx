import { useMemo } from "react";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { useAgenda } from "@/hooks/use-agenda";
import { useTables } from "@/hooks/use-tables";
import { useVenueConfig } from "@/hooks/use-venue-config";
import { allocatedMinutes, bookingMinutes, peakSimultaneousParties, planningConflicts, tightTurnovers } from "@/lib/planning-conflicts";
import { useTimeDisplay } from "@/lib/time-format";
import { useT } from "@/i18n";

/** Warn about actual overlaps, short allocations and table resets separately.
 * A venue-wide duration change must never make already-valid stored allocations appear conflicted. */
export function PlanningConflictsBanner({ venueId, date }: { venueId: string; date: string }) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const agenda = useAgenda(venueId, date);
  const tables = useTables(venueId);
  const config = useVenueConfig(venueId);

  const analysis = useMemo(() => {
    const reservations = agenda.data?.reservations;
    const venueTables = tables.data?.tables;
    const turnTimes = config.data?.turnTimes;
    if (!reservations || !venueTables || !config.data) return null;
    const active = reservations.filter((r) => r.status === "booked" || r.status === "seated");
    return {
      conflicts: planningConflicts(reservations, venueTables, turnTimes),
      turnovers: tightTurnovers(reservations, venueTables, turnTimes),
      exceptions: active.filter((r) =>
        r.durationMinutes != null &&
        allocatedMinutes(r, turnTimes) < bookingMinutes(turnTimes, r.partySize)),
      peakParties: peakSimultaneousParties(reservations, turnTimes),
      tableCount: venueTables.length,
      turnTimes,
    };
  }, [agenda.data, tables.data, config.data]);

  if (!analysis) return null;
  const { conflicts, turnovers, exceptions, peakParties, tableCount, turnTimes } = analysis;
  const capacityConflict = peakParties > tableCount;
  if (!conflicts.length && !turnovers.length && !exceptions.length && !capacityConflict) return null;
  const actualConflicts = conflicts.length > 0 || capacityConflict;
  let summary = t("floor.planning.savedIssues");
  if (conflicts.length > 0) summary = t("floor.planning.conflicts", { count: conflicts.length });
  else if (capacityConflict) summary = t("floor.planning.capacityHeading");

  return (
    <details
      className={actualConflicts
        ? "rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3"
        : "rounded-xl border bg-card px-4 py-3"}
      data-testid="floor-planning-conflicts"
    >
      <summary className="flex cursor-pointer items-start gap-3 text-sm font-medium">
        {actualConflicts
          ? <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          : <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <span>{summary}</span>
      </summary>

      {actualConflicts && (
        <>
          {conflicts.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{t("floor.planning.details")}</p>}
          {capacityConflict && (
            <p className="mt-2 text-sm font-medium text-destructive" data-testid="floor-peak-parties-warning">
              {t("floor.planning.insufficientTables", { parties: peakParties, tables: tableCount })}
            </p>
          )}
          {conflicts.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm" data-testid="floor-actual-conflicts">
              {conflicts.map(({ tableId, tableName, earlier, later, overlapMinutes }) => (
                <li key={`${tableId}:${earlier.id}:${later.id}`} className="border-t pt-2">
                  <strong>{t("floor.planning.table", { table: tableName })}:</strong>{" "}
                  {earlier.guest.name || t("agenda.rowGuestless")} ({displayTime(earlier.time)}){" "}
                  <span aria-hidden="true">→</span>{" "}
                  {later.guest.name || t("agenda.rowGuestless")} ({displayTime(later.time)})
                  <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">
                    {t("floor.planning.overlap", { minutes: overlapMinutes })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {exceptions.length > 0 && (
        <section className="mt-3 space-y-2 border-t pt-3 text-sm">
          <h3 className="font-semibold">{t("floor.planning.shortHeading")}</h3>
          <p className="text-muted-foreground">{t("floor.planning.shortDescription")}</p>
          <ul className="space-y-1">
            {exceptions.map((r) => (
              <li key={r.id}>
                {t("floor.planning.shortRow", {
                  guest: r.guest.name || t("agenda.rowGuestless"),
                  time: displayTime(r.time),
                  minutes: allocatedMinutes(r, turnTimes),
                  defaultMinutes: bookingMinutes(turnTimes, r.partySize),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {turnovers.length > 0 && (
        <section className="mt-3 space-y-2 border-t pt-3 text-sm">
          <h3 className="font-semibold">{t("floor.planning.turnHeading")}</h3>
          <p className="text-muted-foreground">{t("floor.planning.turnDescription")}</p>
          <ul className="space-y-1">
            {turnovers.map((turn) => (
              <li key={`${turn.tableId}:${turn.earlier.id}:${turn.later.id}`}>
                {t("floor.planning.turnRow", {
                  table: turn.tableName,
                  earlier: turn.earlier.guest.name || t("agenda.rowGuestless"),
                  later: turn.later.guest.name || t("agenda.rowGuestless"),
                  time: displayTime(turn.later.time),
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </details>
  );
}
