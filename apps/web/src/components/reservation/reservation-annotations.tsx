import { Fragment } from "react";
import { useT } from "@/i18n";
import { parseReservationCommentary } from "@/lib/reservation-commentary";

interface ReservationAnnotationsProps {
  commentary?: string | null;
  variant?: "compact" | "details" | "print";
  includeStaffNotes?: boolean;
}

/** One presentation for imported references, grouped guests, and real staff notes. */
export function ReservationAnnotations({
  commentary,
  variant = "compact",
  includeStaffNotes = true,
}: ReservationAnnotationsProps) {
  const t = useT();
  const { reference, members, note } = parseReservationCommentary(commentary);
  const entries = [
    reference ? { key: "reference", label: t("reservation.annotation.reference"), value: reference } : null,
    members ? { key: "members", label: t("reservation.annotation.members"), value: members } : null,
    note && includeStaffNotes ? { key: "note", label: t("reservation.annotation.staffNote"), value: note } : null,
  ].filter((entry): entry is { key: string; label: string; value: string } => entry !== null);
  if (entries.length === 0) return null;

  if (variant === "details") {
    return (
      <>
        {entries.map((entry) => (
          <Fragment key={entry.key}>
            <dt className="text-muted-foreground">{entry.label}</dt>
            <dd className="min-w-0 break-words">{entry.value}</dd>
          </Fragment>
        ))}
      </>
    );
  }

  return (
    <div className={variant === "print" ? "mt-1 space-y-0.5 text-xs" : "space-y-1 text-xs text-muted-foreground"}>
      {entries.map((entry) => (
        <p key={entry.key} className="break-words">
          <span className="font-medium">{entry.label}:</span>{" "}
          {entry.value}
        </p>
      ))}
    </div>
  );
}
