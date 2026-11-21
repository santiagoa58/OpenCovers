import type { ReactNode } from "react";
import { ArmchairIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";
import { useTimeDisplay } from "@/lib/time-format";
import { FloorSkinToggle } from "./floor-skin-toggle";

interface FloorRoomProps {
  time: string;
  tableCount: number;
  free: number;
  occupied: number;
  covers: number;
  bookableCount: number | null;
  availabilityError: boolean;
  loading: boolean;
  loadFailed: boolean;
  error?: unknown;
  retrying: boolean;
  onRetry: () => void;
  onAddTables?: () => void;
  children: ReactNode;
}

/** Table status at the selected time. Loading, error and empty states are isolated from the floor canvas. */
export function FloorRoom({
  time, tableCount, free, occupied, covers, bookableCount, availabilityError,
  loading, loadFailed, error, retrying, onRetry, onAddTables, children,
}: FloorRoomProps) {
  const t = useT();
  const displayTime = useTimeDisplay();

  return (
    <section aria-labelledby="floor-room-title" data-testid="floor-room" className="space-y-4 border-t pt-6 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 id="floor-room-title" className="font-display text-xl">{t("floor.room.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("floor.room.description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="floor-selected-time" className="text-sm text-muted-foreground tabular-nums">
            {t("floor.timeline.selected", { time: displayTime(time) })}
          </span>
          {tableCount > 0 && <FloorSkinToggle />}
        </div>
      </div>

      {tableCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm">
          <TableLegend tone="free" label={t("floor.free")} value={free} />
          <TableLegend tone="occupied" label={t("floor.occupied")} value={occupied} />
          {bookableCount !== null && (
            <span className="font-medium tabular-nums">{t("floor.planning.bookable", { count: bookableCount })}</span>
          )}
          {availabilityError && (
            <span role="status" className="text-destructive">{t("floor.planning.availabilityError")}</span>
          )}
          <span className="text-muted-foreground tabular-nums">{t("floor.seatedCovers", { count: covers })}</span>
        </div>
      )}

      <FloorRoomContent
        loading={loading}
        loadFailed={loadFailed}
        error={error}
        retrying={retrying}
        onRetry={onRetry}
        tableCount={tableCount}
        onAddTables={onAddTables}
      >
        {children}
      </FloorRoomContent>
    </section>
  );
}

function FloorRoomContent({
  loading, loadFailed, error, retrying, onRetry, tableCount, onAddTables, children,
}: Pick<FloorRoomProps, "loading" | "loadFailed" | "error" | "retrying" | "onRetry" | "tableCount" | "onAddTables" | "children">) {
  const t = useT();
  if (loading) return <Skeleton className="h-[480px] w-full" />;
  if (loadFailed) return (
    <LoadError what={t("floor.loadWhat")} error={error} retrying={retrying} onRetry={onRetry} />
  );
  if (tableCount > 0) return <>{children}</>;

  return (
    <EmptyState
      icon={ArmchairIcon}
      title={t("floor.empty.title")}
      description={t("floor.empty.description")}
      action={onAddTables && (
        <Button className="mt-2" onClick={onAddTables}>
          {t("floor.empty.action")}
        </Button>
      )}
    />
  );
}

function TableLegend({ tone, label, value }: { tone: "free" | "occupied"; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={tone === "occupied"
          ? "size-3 rounded-full border-2 border-success bg-success-soft"
          : "size-3 rounded-full border-2 border-wood-edge bg-tabletop"}
      />
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground tabular-nums">{value}</span>
    </span>
  );
}
