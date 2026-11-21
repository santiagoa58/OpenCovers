import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlusIcon,
  PrinterIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DayNav } from "@/components/day-nav";
import { PrintReservationsDialog } from "@/components/printing/print-reservations-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignTablesDialog } from "@/components/reservation/assign-tables-dialog";
import { CancelReservationDialog } from "@/components/reservation/cancel-reservation-dialog";
import { EditReservationDialog } from "@/components/reservation/edit-reservation-dialog";
import { ReservationTraceDialog } from "@/components/reservation/reservation-trace-dialog";
import { WalkInDialog } from "@/components/reservation/walk-in-dialog";
import { EmptyState } from "@/components/empty-state";
import { LoadError } from "@/components/load-error";
import { useAgenda } from "@/hooks/use-agenda";
import { useTables } from "@/hooks/use-tables";
import { useT } from "@/i18n";
import { api, type Reservation } from "@/lib/api";
import { longDate } from "@/lib/date";
import { useUrlDate } from "@/lib/url-state";
import { errorMessage, isApiError } from "@/lib/error-message";
import { ReservationRow } from "./reservation-row";

function groupByService(reservations: Reservation[]) {
  const groups: { service: string; items: Reservation[] }[] = [];
  for (const r of reservations) {
    const group = groups.find((g) => g.service === r.service);
    if (group) group.items.push(r);
    else groups.push({ service: r.service, items: [r] });
  }
  return groups;
}

export function AgendaView({ venueId }: { venueId: string }) {
  const t = useT();
  const [date, setDate] = useUrlDate();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [assigning, setAssigning] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const [tracing, setTracing] = useState<Reservation | null>(null);
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, isRefetching, refetch } = useAgenda(venueId, date);
  const reservations = data?.reservations ?? [];
  const { data: tablesData } = useTables(venueId);
  const tableNames = new Map((tablesData?.tables ?? []).map((table) => [table.id, table.name]));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["agenda", venueId] });
    void queryClient.invalidateQueries({ queryKey: ["availability", venueId] });
    void queryClient.invalidateQueries({ queryKey: ["floor", venueId] });
    void queryClient.invalidateQueries({ queryKey: ["preshift", venueId] });
  };

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelReservation(venueId, id),
    onSuccess: () => {
      toast.success(t("agenda.cancelled"));
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, t("agenda.cancelFailed"))),
    onSettled: () => setCancelling(null),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.setStatus(venueId, id, status),
    onSuccess: () => invalidate(),
    onError: (err, { id }) => {
      if (isApiError(err, "table_required")) {
        toast.error(errorMessage(err, t("agenda.assignFirst")));
        const reservation = reservations.find((r) => r.id === id);
        if (reservation) setAssigning(reservation);
        return;
      }
      toast.error(errorMessage(err, t("agenda.updateFailed")));
    },
  });

  const active = reservations.filter((r) => ["booked", "seated", "attended"].includes(r.status));
  const needTable = active.filter(
    (r) => ["booked", "seated"].includes(r.status) && (r.tables ?? []).length === 0,
  ).length;
  const groups = groupByService(reservations);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("agenda.title")}
        description={<span className="first-letter:uppercase">{longDate(date)}</span>}
        actions={
          <>
            <DayNav date={date} onChange={setDate} />
            <Button variant="outline" onClick={() => setPrintOpen(true)}>
              <PrinterIcon className="size-4" />
              {t("preshift.print")}
            </Button>
            <Button onClick={() => setWalkInOpen(true)}>{t("agenda.walkIn")}</Button>
          </>
        }
      />

      {isPending ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError && !data ? (
        <LoadError what={t("agenda.loadWhat")} error={error} retrying={isRefetching} onRetry={() => void refetch()} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={CalendarPlusIcon}
          title={t("agenda.empty.title")}
          description={t("agenda.empty.description")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("agenda.stat.reservations")} value={active.length} />
            <Stat label={t("agenda.stat.covers")} value={active.reduce((n, r) => n + r.partySize, 0)} />
            <Stat label={t("agenda.stat.seated")} value={active.filter((r) => r.status === "seated").length} />
            <Stat label={t("agenda.stat.needsTable")} value={needTable} tone={needTable > 0 ? "danger" : "default"} />
          </div>

          {groups.map((group) => (
            <section key={group.service} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="font-display text-lg first-letter:uppercase">{group.service || t("agenda.service")}</h2>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {t("agenda.bookings", { count: group.items.length })} ·{" "}
                  {t("agenda.covers", { count: group.items.reduce((n, r) => n + r.partySize, 0) })}
                </span>
              </div>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {group.items.map((r) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    tableNames={tableNames}
                    onAssign={() => setAssigning(r)}
                    onCancel={() => setCancelling(r)}
                    onStatus={(status) => setStatus.mutate({ id: r.id, status })}
                    onEdit={() => setEditing(r)}
                    onTrace={() => setTracing(r)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {printOpen && (
        <PrintReservationsDialog venueId={venueId} date={date} initialScope="day" onClose={() => setPrintOpen(false)} />
      )}
      <WalkInDialog venueId={venueId} open={walkInOpen} onOpenChange={setWalkInOpen} />
      <AssignTablesDialog
        venueId={venueId}
        reservation={assigning}
        onOpenChange={(open) => {
          if (!open) setAssigning(null);
        }}
      />
      <CancelReservationDialog
        reservation={cancelling}
        pending={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id)}
        onClose={() => setCancelling(null)}
      />
      <EditReservationDialog
        venueId={venueId}
        reservation={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <ReservationTraceDialog
        venueId={venueId}
        reservation={tracing}
        onOpenChange={(open) => {
          if (!open) setTracing(null);
        }}
      />
    </div>
  );
}

