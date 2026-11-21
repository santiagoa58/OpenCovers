import { errorMessage } from "@/lib/error-message";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimeField } from "@/components/time-field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConsentSelect } from "@/components/reservation/consent-select";
import { ReservationAnnotations } from "@/components/reservation/reservation-annotations";
import { useT } from "@/i18n";
import { api, COMMENTARY_MAX, type Consent, type Reservation } from "@/lib/api";
import { formatReservationCommentary, parseReservationCommentary } from "@/lib/reservation-commentary";

interface EditValues {
  name: string;
  date: string;
  time: string;
  partySize: number;
  consent: Consent;
  rating: string;
  commentary: string;
}

const NO_RATING = "none";

function toValues(reservation: Reservation | null): EditValues {
  return {
    name: reservation?.guest.name ?? "",
    date: reservation?.date ?? "",
    time: reservation?.time ?? "",
    partySize: reservation?.partySize ?? 1,
    consent: reservation?.guest.consent ?? "unknown",
    rating: reservation?.rating ? String(reservation.rating) : NO_RATING,
    commentary: parseReservationCommentary(reservation?.commentary).note ?? "",
  };
}

export function EditReservationDialog({
  venueId,
  reservation,
  onOpenChange,
}: {
  venueId: string;
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const bookingDetails = formatReservationCommentary(reservation?.commentary, "");
  const staffNoteMax = Math.max(0, COMMENTARY_MAX - (bookingDetails ? bookingDetails.length + "\nStaff note: ".length : 0));
  const {
    handleSubmit,
    reset,
    control,
    register,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ defaultValues: toValues(reservation) });

  useEffect(() => {
    reset(toValues(reservation));
  }, [reservation, reset]);

  async function onSubmit(values: EditValues) {
    if (!reservation) return;
    try {
      await api.modifyReservation(venueId, reservation.id, {
        date: values.date,
        time: values.time,
        partySize: values.partySize,
        guest: { name: values.name.trim(), consent: values.consent },
        rating: values.rating === NO_RATING ? null : Number(values.rating),
        commentary: formatReservationCommentary(reservation.commentary, values.commentary),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agenda", venueId] }),
        queryClient.invalidateQueries({ queryKey: ["floor", venueId] }),
        queryClient.invalidateQueries({ queryKey: ["availability", venueId] }),
        queryClient.invalidateQueries({ queryKey: ["pacing", venueId] }),
        queryClient.invalidateQueries({ queryKey: ["reservation", venueId, reservation.id] }),
      ]);
      toast.success(t("reservation.edit.done"));
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t("reservation.edit.failed")));
    }
  }

  return (
    <Dialog open={reservation !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reservation.edit.title")}</DialogTitle>
          <DialogDescription>
            {reservation?.guest.name
              ? t("reservation.edit.description", { name: reservation.guest.name })
              : t("reservation.edit.descriptionUnnamed")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-guest-name">{t("reservation.guestName")}</Label>
            <Input id="edit-guest-name" maxLength={200} {...register("name")} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-date">{t("reservation.edit.date")}</Label>
              <Input id="edit-date" type="date" disabled={reservation?.status === "attended"}
                {...register("date", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">{t("reservation.edit.time")}</Label>
              <Controller name="time" control={control} rules={{ required: true }}
                render={({ field }) => (
                  <TimeField id="edit-time" label={t("reservation.edit.time")} value={field.value} onChange={field.onChange}
                    onBlur={field.onBlur} disabled={reservation?.status === "attended"} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-party-size">{t("reservation.partySize")}</Label>
              <Input id="edit-party-size" type="number" min={1} disabled={reservation?.status === "attended"}
                {...register("partySize", { valueAsNumber: true, min: 1 })} />
              {errors.partySize && <p className="text-sm text-destructive">{t("reservation.atLeastOne")}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("reservation.edit.scheduleHelp")}</p>
          <div className="space-y-2">
            <Label htmlFor="edit-consent">{t("reservation.contactConsent")}</Label>
            <Controller
              name="consent"
              control={control}
              render={({ field }) => (
                <ConsentSelect id="edit-consent" value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("reservation.edit.rating")}</Label>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label={t("reservation.edit.rating")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RATING}>{t("reservation.edit.noRating")}</SelectItem>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <ReservationAnnotations commentary={reservation?.commentary} includeStaffNotes={false} />
            <Label htmlFor="edit-commentary">{t("reservation.note")}</Label>
            <Textarea
              id="edit-commentary"
              maxLength={staffNoteMax}
              placeholder={t("reservation.notePlaceholder")}
              {...register("commentary")}
            />
            <p className="text-sm text-muted-foreground">
              {t("reservation.noteHint", { max: staffNoteMax })}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
