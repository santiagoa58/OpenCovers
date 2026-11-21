import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n";
import type { Reservation } from "@/lib/api";
import { useTimeDisplay } from "@/lib/time-format";

/** Asks before cancelling, because a cancelled reservation cannot be reopened from the agenda. */
export function CancelReservationDialog({
  reservation,
  pending,
  onConfirm,
  onClose,
}: {
  reservation: Reservation | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const displayTime = useTimeDisplay();
  return (
    <Dialog open={reservation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reservation.cancel.title")}</DialogTitle>
          <DialogDescription>
            {reservation
              ? reservation.guest.name
                ? t("reservation.cancel.description", {
                    time: displayTime(reservation.time),
                    count: reservation.partySize,
                    name: reservation.guest.name,
                  })
                : t("reservation.cancel.descriptionUnnamed", {
                    time: displayTime(reservation.time),
                    count: reservation.partySize,
                  })
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("reservation.cancel.keep")}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? t("reservation.cancel.cancelling") : t("reservation.cancel.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
