import { Trash2Icon, UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/pill";
import { useT } from "@/i18n";
import type { WaitlistEntry } from "@/lib/api";
import { elapsed } from "@/lib/date";
import { guestInitials } from "@/lib/format";

export function WaitlistRow({
  entry,
  position,
  onSeat,
  onRemove,
}: {
  entry: WaitlistEntry;
  position: number;
  onSeat: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <li
      data-slot="waitlist-row"
      className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[2rem_minmax(0,1fr)_4rem_7rem_8rem_auto] md:gap-x-4"
    >
      <span
        aria-label={t("waitlist.position", { position })}
        className="flex size-8 items-center justify-center rounded-full bg-muted font-display text-sm tabular-nums"
      >
        {position}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{guestInitials(entry.guestName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{entry.guestName || "—"}</div>
          {entry.guestContact && (
            <div className="truncate text-xs text-muted-foreground">{entry.guestContact}</div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 md:order-last">
        <Button variant="outline" size="sm" onClick={onSeat}>
          {t("waitlist.seat")}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t("waitlist.remove")} onClick={onRemove}>
          <Trash2Icon className="size-4" />
        </Button>
      </div>
      <div className="col-span-3 col-start-1 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[calc(2rem+0.75rem)] md:contents">
        <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <UsersIcon className="size-4" aria-hidden="true" />
          <span className="sr-only">{t("common.partyOf", { count: entry.partySize })}</span>
          <span aria-hidden="true">{entry.partySize}</span>
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t("waitlist.waiting")} <span className="font-medium text-foreground">{elapsed(entry.createdAt)}</span>
        </span>
        {entry.zone ? (
          <Pill tone="muted">{entry.zone}</Pill>
        ) : (
          <span aria-hidden="true" className="hidden text-muted-foreground md:inline">
            —
          </span>
        )}
      </div>
    </li>
  );
}
