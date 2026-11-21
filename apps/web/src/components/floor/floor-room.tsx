import { ArmchairIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AsyncContent } from "@/components/async-content";
import { canEditSetup, useNavigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";
import { useTimeDisplay } from "@/lib/time-format";
import type { FloorTable } from "@/lib/api";
import { FloorCanvas, type CanvasItem, type CanvasTable } from "./floor-canvas";
import { FloorSkinToggle } from "./floor-skin-toggle";

interface FloorRoomProps {
  venueId: string;
  time: string;
  tables: FloorTable[];
  bookingTables: CanvasTable[];
  items: CanvasItem[];
  bookableCount: number | null;
  availabilityError: boolean;
  loading: boolean;
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
  onSeat: (tableId: string) => void;
  onMove: (reservationId: string, targetTableId: string) => void;
  onMoveRequest: (tableId: string) => void;
}

/** The selected room snapshot: availability, table map and its local actions. */
export function FloorRoom({
  venueId,
  time,
  tables,
  bookingTables,
  items,
  bookableCount,
  availabilityError,
  loading,
  error,
  retrying,
  onRetry,
  onSeat,
  onMove,
  onMoveRequest,
}: FloorRoomProps) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const nav = useNavigation();
  const occupied = tables.filter((table) => table.occupied).length;
  const free = tables.length - occupied;
  const covers = tables.reduce((count, table) => count + (table.occupied ? (table.partySize ?? 0) : 0), 0);

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
          {tables.length > 0 && <FloorSkinToggle />}
        </div>
      </div>

      {tables.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm">
          <TableCount tone="free" label={t("floor.free")} value={free} />
          <TableCount tone="occupied" label={t("floor.occupied")} value={occupied} />
          {bookableCount !== null && (
            <span className="font-medium tabular-nums">{t("floor.planning.bookable", { count: bookableCount })}</span>
          )}
          {availabilityError && (
            <span role="status" className="text-destructive">{t("floor.planning.availabilityError")}</span>
          )}
          <span className="text-muted-foreground tabular-nums">{t("floor.seatedCovers", { count: covers })}</span>
        </div>
      )}

      <AsyncContent
        loading={loading}
        error={error}
        retrying={retrying}
        onRetry={onRetry}
        what={t("floor.loadWhat")}
        empty={tables.length === 0}
        loadingContent={<Skeleton className="h-[480px] w-full" />}
        emptyContent={
          <EmptyState
            icon={ArmchairIcon}
            title={t("floor.empty.title")}
            description={t("floor.empty.description")}
            action={nav && canEditSetup(nav.role) && (
              <Button className="mt-2" onClick={() => nav.goTo("setup", "room")}>
                {t("floor.empty.action")}
              </Button>
            )}
          />
        }
      >
        <FloorCanvas
          tables={bookingTables}
          items={items}
          mode="view"
          venueId={venueId}
          onSeat={onSeat}
          onMove={onMove}
          onMoveRequest={onMoveRequest}
        />
      </AsyncContent>
    </section>
  );
}

function TableCount({ tone, label, value }: { tone: "free" | "occupied"; label: string; value: number }) {
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
