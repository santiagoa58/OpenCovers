import { cn } from "cn";
import { MoreHorizontalIcon, UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT, type MessageKey } from "@/i18n";
import type { Reservation } from "@/lib/api";
import { guestInitials } from "@/lib/format";
import { parseReservationCommentary } from "@/lib/reservation-commentary";
import { useTimeDisplay } from "@/lib/time-format";
import { StatusBadge } from "./status-badge";

type RowAction =
  | { kind: "status"; labelKey: MessageKey; status: string }
  | { kind: "cancel"; labelKey: MessageKey };

function rowActions(status: string): RowAction[] {
  switch (status) {
    case "booked":
      return [
        { kind: "status", labelKey: "agenda.action.seat", status: "seated" },
        { kind: "status", labelKey: "common.status.noShow", status: "no_show" },
        { kind: "cancel", labelKey: "common.cancel" },
      ];
    case "seated":
      return [
        { kind: "status", labelKey: "agenda.action.undoSeating", status: "booked" },
        { kind: "status", labelKey: "agenda.action.markAttended", status: "attended" },
        { kind: "cancel", labelKey: "common.cancel" },
      ];
    case "attended":
      return [{ kind: "status", labelKey: "agenda.action.undoAttended", status: "seated" }];
    case "no_show":
      return [{ kind: "status", labelKey: "agenda.action.undoNoShow", status: "booked" }];
    default:
      return [];
  }
}

export function ReservationRow({
  reservation,
  tableNames,
  onAssign,
  onCancel,
  onStatus,
  onEdit,
  onTrace,
}: {
  reservation: Reservation;
  tableNames: Map<string, string>;
  onAssign: () => void;
  onCancel: () => void;
  onStatus: (status: string) => void;
  onEdit: () => void;
  onTrace: () => void;
}) {
  const t = useT();
  const displayTime = useTimeDisplay();
  const actions = rowActions(reservation.status);
  const canEdit = ["booked", "seated", "attended"].includes(reservation.status);
  const canAssign = ["booked", "seated"].includes(reservation.status);
  const tableIds = reservation.tables ?? [];
  const partyMembers = parseReservationCommentary(reservation.commentary).members;

  const finished = reservation.status === "cancelled" || reservation.status === "no_show";

  return (
    <li
      data-slot="reservation-row"
      className={cn(
        "grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[4rem_minmax(0,1fr)_4.5rem_9rem_8rem_2.25rem] md:gap-x-4",
        finished && "text-muted-foreground",
      )}
    >
      <div className="font-display text-xl tabular-nums">{displayTime(reservation.time)}</div>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{guestInitials(reservation.guest.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{reservation.guest.name || "—"}</div>
          {reservation.guest.contact && (
            <div className="truncate text-xs text-muted-foreground">{reservation.guest.contact}</div>
          )}
          {partyMembers && (
            <div className="line-clamp-2 text-xs leading-snug text-muted-foreground" title={partyMembers}>
              {t("reservation.annotation.members")}: {partyMembers}
            </div>
          )}
        </div>
      </div>
      <div className="md:order-last">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("agenda.rowActionsFor", { time: displayTime(reservation.time), name: reservation.guest.name || t("agenda.rowGuestless") })}>
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.labelKey}
                onSelect={() => {
                   if (action.kind === "cancel") {
                     onCancel();
                     return;
                   }
                   onStatus(action.status);
                 }}
              >
                {t(action.labelKey)}
              </DropdownMenuItem>
            ))}
            {canAssign && (
              <DropdownMenuItem onSelect={onAssign}>
                {tableIds.length > 0 ? t("agenda.changeTables") : t("agenda.assignTables")}
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onSelect={onEdit}>{t("agenda.editDetails")}</DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onTrace}>{t("agenda.viewTrace")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="col-span-3 col-start-1 flex flex-wrap items-center gap-x-3 gap-y-2 pl-[calc(3.5rem+0.75rem)] md:contents">
        <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <UsersIcon className="size-4" aria-hidden="true" />
          <span className="sr-only">{t("common.partyOf", { count: reservation.partySize })}</span>
          <span aria-hidden="true">{reservation.partySize}</span>
        </span>
        <span className="text-sm">
          <ReservationTables tableIds={tableIds} tableNames={tableNames} canAssign={canAssign} />
        </span>
        <StatusBadge status={reservation.status} />
      </div>
    </li>
  );
}

function ReservationTables({
  tableIds,
  tableNames,
  canAssign,
}: {
  tableIds: string[];
  tableNames: Map<string, string>;
  canAssign: boolean;
}) {
  const t = useT();
  if (tableIds.length > 0) return <>{tableIds.map((id) => tableNames.get(id) ?? id).join(", ")}</>;
  if (!canAssign) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className="border-transparent bg-danger-soft text-destructive">
      {t("agenda.unassigned")}
    </Badge>
  );
}
