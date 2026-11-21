import { StarIcon } from "lucide-react";
import { cn } from "cn";
import { Pill } from "@/components/pill";
import { ReservationAnnotations } from "@/components/reservation/reservation-annotations";
import { useT } from "@/i18n";
import { longDate } from "@/lib/date";
import type { PreShiftRow } from "@/lib/pre-shift";
import { useTimeDisplay } from "@/lib/time-format";
import { ReconfirmationPill } from "./reconfirmation-pill";

export function PreShiftRowView({ row, selectedDate, reservedAtTime }: { row: PreShiftRow; selectedDate: string; reservedAtTime: boolean }) {
  const t = useT();
  const { reservation, tableNames, large, commentary } = row;
  const displayTime = useTimeDisplay();
  return (
    <li
      data-slot="preshift-row"
      className={cn(
        "grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-l-4 border-l-transparent px-4 py-3 md:grid-cols-[4rem_minmax(0,13rem)_6rem_8rem_minmax(0,1fr)] md:items-start md:gap-x-4 print:break-inside-avoid print:py-2",
        large && "border-l-warning",
      )}
    >
      <div>
        <div className="font-display text-xl tabular-nums">{displayTime(reservation.time)}</div>
        {reservation.date !== selectedDate && (
          <p className="text-xs text-muted-foreground">{longDate(reservation.date)}</p>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium">{reservation.guest.name || "—"}</div>
        <div className="text-xs text-muted-foreground">
          {t(reservedAtTime ? "preshift.reservedAtTime" : "preshift.arrivingInSlot")}
        </div>
        {reservation.guest.contact && (
          <div className="truncate text-xs text-muted-foreground">{reservation.guest.contact}</div>
        )}
      </div>
      <div className="col-span-2 col-start-1 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[calc(3.5rem+0.75rem)] md:contents">
        <div>
          {large ? (
            <Pill tone="warning" className="tabular-nums">
              {t("preshift.large", { count: reservation.partySize })}
            </Pill>
          ) : (
            <span className="text-sm tabular-nums">
              <span className="sr-only">{t("common.partyOf", { count: reservation.partySize })}</span>
              <span aria-hidden="true">{reservation.partySize}</span>
            </span>
          )}
        </div>
        <div className="text-sm">
          {tableNames.length > 0 ? (
            tableNames.join(", ")
          ) : (
            <Pill tone="danger">{t("preshift.unassigned")}</Pill>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:basis-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span data-slot="reconfirmation">
              <ReconfirmationPill value={reservation.reconfirmation} />
            </span>
            {reservation.rating ? (
              <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                <StarIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("preshift.rating", { rating: reservation.rating })}</span>
                <span aria-hidden="true">{reservation.rating}</span>
              </span>
            ) : null}
          </div>
          <ReservationAnnotations commentary={commentary} />
        </div>
      </div>
    </li>
  );
}

