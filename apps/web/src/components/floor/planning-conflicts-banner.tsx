import { useMemo } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { useAgenda } from "@/hooks/use-agenda";
import { useTables } from "@/hooks/use-tables";
import { useVenueConfig } from "@/hooks/use-venue-config";
import { peakSimultaneousParties, planningConflicts } from "@/lib/planning-conflicts";
import { useTimeDisplay } from "@/lib/time-format";
import { useT } from "@/i18n";

/** A planning warning, not an assertion that stored reservations have already been extended. */
export function PlanningConflictsBanner({ venueId, date }: { venueId: string; date: string }) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const agenda = useAgenda(venueId, date);
  const tables = useTables(venueId);
  const config = useVenueConfig(venueId);
  const conflicts = useMemo(() => {
    if (!agenda.data?.reservations || !tables.data?.tables || !config.data) return [];
    return planningConflicts(agenda.data.reservations, tables.data.tables, config.data.turnTimes);
  }, [agenda.data, tables.data, config.data]);
  if (!agenda.data?.reservations || !tables.data?.tables || !config.data) return null;
  const duration = config.data.turnTimes?.[0]?.minutes ?? 120;
  const peakParties = peakSimultaneousParties(agenda.data.reservations, config.data.turnTimes);
  const capacityConflict = peakParties > tables.data.tables.length;
  if (!conflicts.length && !capacityConflict) return null;
  return (
    <details className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3" data-testid="floor-planning-conflicts">
      <summary className="flex cursor-pointer items-start gap-3 text-sm font-medium">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span>{t("floor.planning.conflicts", { count: conflicts.length, minutes: duration })}</span>
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">{t("floor.planning.details")}</p>
      {capacityConflict && (
        <p className="mt-2 font-medium text-sm text-destructive" data-testid="floor-peak-parties-warning">
          {t("floor.planning.insufficientTables", { parties: peakParties, tables: tables.data.tables.length })}
        </p>
      )}
      <ul className="mt-3 space-y-2 text-sm">
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
    </details>
  );
}
