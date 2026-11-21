import { errorMessage } from "@/lib/error-message";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTables } from "@/hooks/use-tables";
import { useT } from "@/i18n";
import { api, COMMENTARY_MAX } from "@/lib/api";
import { useTimeDisplay } from "@/lib/time-format";

interface FormValues {
  partySize: number;
  name: string;
  contact: string;
  commentary: string;
}

interface NewReservationDialogProps {
  venueId: string;
  date: string;
  time: string;
  partySize: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewReservationDialog({
  venueId,
  date,
  time,
  partySize,
  open,
  onOpenChange,
}: NewReservationDialogProps) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const queryClient = useQueryClient();
  const { data } = useTables(venueId);
  const tables = data?.tables ?? [];
  const [selected, setSelected] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { partySize, name: "", contact: "", commentary: "" },
  });

  const watchedPartySize = Number(watch("partySize")) || 0;
  const tableAvailability = useQuery({
    queryKey: ["table-availability", venueId, date, time, watchedPartySize],
    queryFn: () => api.getTableAvailability(venueId, date, time, watchedPartySize),
    enabled: open && Boolean(date && time) && watchedPartySize > 0,
  });
  const statuses = new Map((tableAvailability.data?.tables ?? []).map((table) => [table.id, table]));
  const unavailableSelected = selected.some((id) => statuses.get(id)?.available === false);

  const totalSeats = useMemo(
    () =>
      tables
        .filter((t) => selected.includes(t.id))
        .reduce((sum, t) => sum + t.seats, 0),
    [tables, selected],
  );

  useEffect(() => {
    if (open) {
      reset({ partySize, name: "", contact: "", commentary: "" });
      setSelected([]);
    }
  }, [open, partySize, reset]);

  function toggleTable(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(values: FormValues) {
    if (selected.length === 0) {
      toast.error(t("reservation.selectTable"));
      return;
    }
    if (values.partySize > totalSeats) {
      toast.error(t("reservation.partyTooLarge"));
      return;
    }
    if (tableAvailability.isPending || tableAvailability.isError || unavailableSelected) {
      toast.error(t("reservation.tableAvailability.refresh"));
      return;
    }
    try {
      await api.createReservation(venueId, {
        date,
        time,
        partySize: values.partySize,
        tables: selected,
        guest: {
          name: values.name || undefined,
          contact: values.contact || undefined,
        },
        commentary: values.commentary.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["agenda", venueId] });
      await queryClient.invalidateQueries({ queryKey: ["availability", venueId] });
      await queryClient.invalidateQueries({ queryKey: ["table-availability", venueId] });
      await queryClient.invalidateQueries({ queryKey: ["floor", venueId] });
      toast.success(t("reservation.new.done"));
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t("reservation.new.failed")));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reservation.new.title")}</DialogTitle>
          <DialogDescription>
            {t("reservation.new.description", { date, time: displayTime(time) })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party-size">{t("reservation.partySize")}</Label>
            <Input
              id="party-size"
              type="number"
              min={1}
              {...register("partySize", {
                valueAsNumber: true,
                required: t("reservation.partySizeRequired"),
                min: { value: 1, message: t("reservation.atLeastOne") },
              })}
            />
            {errors.partySize && (
              <p className="text-sm text-destructive">{errors.partySize.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("reservation.tables")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("reservation.tableAvailability.subtitle")}
            </p>
            {tableAvailability.isPending && (
              <p className="text-xs text-muted-foreground">{t("reservation.tableAvailability.checking")}</p>
            )}
            {tableAvailability.isError && (
              <p role="alert" className="text-xs text-destructive">{t("reservation.tableAvailability.failed")}</p>
            )}
            {tables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("reservation.noTables")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tables.map((tbl) => {
                  const status = statuses.get(tbl.id);
                  const booked = status?.available === false;
                  return (
                    <Button
                      key={tbl.id}
                      type="button"
                      variant={selected.includes(tbl.id) ? "default" : "outline"}
                      size="sm"
                      disabled={booked || tableAvailability.isPending || tableAvailability.isError}
                      aria-label={`${tbl.name} · ${tbl.seats} · ${booked ? t("reservation.tableAvailability.booked") : t("reservation.tableAvailability.free")}`}
                      title={booked && status?.reservedUntil
                        ? t("reservation.tableAvailability.until", { time: displayTime(status.reservedUntil) })
                        : undefined}
                      onClick={() => toggleTable(tbl.id)}
                      className={booked ? "opacity-60" : ""}
                    >
                      {tbl.name} · {tbl.seats}
                      <span className="ml-1 text-[10px]">
                        {booked
                          ? t("reservation.tableAvailability.booked")
                          : tableAvailability.isPending ? "…" : t("reservation.tableAvailability.free")}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
            {unavailableSelected && (
              <p role="alert" className="text-xs text-destructive">{t("reservation.tableAvailability.refresh")}</p>
            )}
            <p
              className={
                watchedPartySize > totalSeats && selected.length > 0
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {t("reservation.selected", {
                seats: t("common.seats", { count: totalSeats }),
                guests: t("common.guests", { count: watchedPartySize }),
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">{t("reservation.guestName")}</Label>
              <Input id="guest-name" placeholder={t("reservation.guestNamePlaceholder")} {...register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-contact">{t("reservation.contact")}</Label>
              <Input
                id="guest-contact"
                placeholder="jane@example.com" // i18n-ok
                {...register("contact")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservation-commentary">{t("reservation.note")}</Label>
            <Textarea
              id="reservation-commentary"
              maxLength={COMMENTARY_MAX}
              placeholder={t("reservation.notePlaceholder")}
              {...register("commentary")}
            />
            <p className="text-sm text-muted-foreground">
              {t("reservation.noteHint", { max: COMMENTARY_MAX })}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("reservation.new.creating") : t("reservation.new.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
