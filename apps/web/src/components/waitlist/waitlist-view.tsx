import { ConfirmDialog } from "@/components/confirm-dialog";
import { errorMessage } from "@/lib/error-message";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArmchairIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/stat";
import { useWaitlist } from "@/hooks/use-waitlist";
import { useT } from "@/i18n";
import { api, type WaitlistEntry } from "@/lib/api";
import { elapsed } from "@/lib/date";
import { AddWaitlistDialog } from "./add-waitlist-dialog";
import { WaitlistRow } from "./waitlist-row";
import { AsyncContent } from "@/components/async-content";

export function WaitlistView({ venueId }: { venueId: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, isRefetching, refetch } = useWaitlist(venueId);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<WaitlistEntry | null>(null);
  // First come, first seated: the queue is shown oldest first.
  const entries = [...(data?.entries ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["waitlist", venueId] });
    void queryClient.invalidateQueries({ queryKey: ["agenda", venueId] });
    void queryClient.invalidateQueries({ queryKey: ["availability", venueId] });
  };

  const seat = useMutation({
    mutationFn: (id: string) => api.seatWaitlist(venueId, id),
    onSuccess: () => {
      toast.success(t("waitlist.seated"));
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, t("waitlist.seatFailed"))),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelWaitlist(venueId, id),
    onSuccess: () => {
      toast.success(t("waitlist.removed"));
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, t("waitlist.removeFailed"))),
    onSettled: () => setRemoving(null),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("waitlist.title")}
        description={t("waitlist.subtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon /> {t("common.add")}
          </Button>
        }
      />

      <AsyncContent
        loading={isPending}
        error={isError && !data ? error : null}
        retrying={isRefetching}
        onRetry={() => void refetch()}
        what={t("waitlist.loadWhat")}
        empty={entries.length === 0}
        loadingContent={
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((n) => <Skeleton key={n} className="h-24" />)}
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        }
        emptyContent={
          <EmptyState
            icon={ArmchairIcon}
            title={t("waitlist.empty.title")}
            description={t("waitlist.empty.description")}
          />
        }
      >
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("waitlist.stat.parties")} value={entries.length} />
            <Stat label={t("waitlist.stat.guests")} value={entries.reduce((n, e) => n + e.partySize, 0)} />
            <Stat label={t("waitlist.stat.longestWait")} value={elapsed(entries[0].createdAt)} />
          </div>

          <ol className="divide-y overflow-hidden rounded-xl border bg-card">
            {entries.map((e, index) => (
              <WaitlistRow
                key={e.id}
                entry={e}
                position={index + 1}
                onSeat={() => seat.mutate(e.id)}
                onRemove={() => setRemoving(e)}
              />
            ))}
          </ol>
      </AsyncContent>

      <ConfirmDialog
        open={removing !== null}
        title={removalTitle(removing, t)}
        description={t("waitlist.removeDescription")}
        confirmLabel={t("waitlist.removeConfirm")}
        keepLabel={t("waitlist.keep")}
        pending={cancel.isPending}
        onConfirm={() => removing && cancel.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
      <AddWaitlistDialog venueId={venueId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}


function removalTitle(entry: WaitlistEntry | null, t: ReturnType<typeof useT>): string {
  if (!entry) return t("waitlist.removeTitle");
  if (!entry.guestName) return t("waitlist.removeTitleGuest");
  return t("waitlist.removeTitleNamed", { name: entry.guestName });
}
