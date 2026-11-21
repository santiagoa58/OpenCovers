import { errorMessage } from "@/lib/error-message";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArmchairIcon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { DayNav } from "@/components/day-nav";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { PageHeader } from "@/components/layout/page-header";
import { canEditSetup, useNavigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { TimeField } from "@/components/time-field";
import { Skeleton } from "@/components/ui/skeleton";
import { WalkInDialog } from "@/components/reservation/walk-in-dialog";
import { FloorCanvas } from "@/components/floor/floor-canvas";
import { FloorSkinToggle } from "@/components/floor/floor-skin-toggle";
import { PacingView } from "@/components/pacing/pacing-view";
import { PreShiftView } from "@/components/preshift/pre-shift-view";
import { PrintReservationsDialog } from "@/components/printing/print-reservations-dialog";
import { MoveDialog } from "@/components/floor/move-dialog";
import { useFloor } from "@/hooks/use-floor";
import { useFloorItems } from "@/hooks/use-floor-items";
import { api, type FloorTable } from "@/lib/api";
import { useT } from "@/i18n";
import { nowTime, todayIso } from "@/lib/date";
import { setUrlParams, useUrlDate, useUrlTime } from "@/lib/url-state";
import { useTimeDisplay } from "@/lib/time-format";

export function FloorView({ venueId }: { venueId: string }) {
  const t = useT();
  const nav = useNavigation();
  const displayTime = useTimeDisplay();
  const [date, setDate] = useUrlDate();
  const [time, setTime] = useUrlTime();
  const [seatTable, setSeatTable] = useState<FloorTable | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [moveFrom, setMoveFrom] = useState<FloorTable | null>(null);
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, isRefetching, refetch } = useFloor(venueId, date, time);
  const { data: itemsData } = useFloorItems(venueId);

  const tables = data?.tables ?? [];
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
      <div data-testid="floor-controls" className="print:hidden">
        <PageHeader
          title={t("floor.title")}
          description={t("floor.intro")}
          actions={
            <Button variant="outline" onClick={() => setPrintOpen(true)}>
              <PrinterIcon className="size-4" />
              {t("preshift.print")}
            </Button>
          }
        />
        <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" data-testid="floor-filter-bar">
          <DayNav date={date} onChange={setDate} showToday={false} />
          <div className="flex min-w-0 items-center gap-2">
            <TimeField label={t("floor.time")} value={time} onChange={setTime} />
            <Button
              variant="outline"
              className="shrink-0 px-3"
              onClick={() => {
                setUrlParams({ date: todayIso(), time: nowTime() }, "replace");
              }}
            >
              {t("floor.now")}
            </Button>
          </div>
        </div>
      </div>

      <div data-testid="floor-pacing" className="print:hidden">
        <PacingView
          venueId={venueId}
          date={date}
          time={time}
          onSelectTime={setTime}
        />
      </div>

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
            <Legend tone="free" label={t("floor.free")} value={free} />
            <Legend tone="occupied" label={t("floor.occupied")} value={occupied} />
            <span className="text-muted-foreground tabular-nums">{t("floor.seatedCovers", { count: seatedCovers })}</span>
          </div>
        )}

        {isPending ? (
          <Skeleton className="h-[480px] w-full" />
        ) : isError && !data ? (
          <LoadError what={t("floor.loadWhat")} error={error} retrying={isRefetching} onRetry={() => void refetch()} />
        ) : tables.length === 0 ? (
          <EmptyState
            icon={ArmchairIcon}
            title={t("floor.empty.title")}
            description={t("floor.empty.description")}
            action={
              nav && canEditSetup(nav.role) ? (
                <Button className="mt-2" onClick={() => nav.goTo("setup", "room")}>
                  {t("floor.empty.action")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <FloorCanvas
            tables={tables}
            items={items}
            mode="view"
            venueId={venueId}
            onSeat={(tableId) => {
              const table = tables.find((t) => t.id === tableId);
              if (table) setSeatTable(table);
            }}
            onMove={(reservationId, targetTableId) =>
              move.mutate({ reservationId, targetTableId })
            }
            onMoveRequest={(tableId) => {
              const table = tables.find((t) => t.id === tableId);
              if (table?.reservationId) setMoveFrom(table);
            }}
          />
        )}

      </section>

      {data && (
        <PreShiftView
          venueId={venueId}
          date={date}
          time={time}
          floorTables={tables}
        />
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

      <WalkInDialog
        venueId={venueId}
        open={seatTable !== null}
        onOpenChange={(open) => !open && setSeatTable(null)}
        tableId={seatTable?.id}
        tableName={seatTable?.name}
      />
    </div>
  );
}

function Legend({ tone, label, value }: { tone: "free" | "occupied"; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={
          tone === "occupied"
            ? "size-3 rounded-full border-2 border-success bg-success-soft"
            : "size-3 rounded-full border-2 border-wood-edge bg-tabletop"
        }
      />
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground tabular-nums">{value}</span>
    </span>
  );
}
