import type { ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n";
import { ReservationAnnotations } from "./reservation-annotations";

/** Editable staff instructions, with imported booking metadata displayed separately. */
export function StaffNoteField({
  id,
  maxLength,
  originalCommentary,
  inputProps,
}: {
  id: string;
  maxLength: number;
  originalCommentary?: string | null;
  inputProps: ComponentProps<typeof Textarea>;
}) {
  const t = useT();
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-2">
      <ReservationAnnotations commentary={originalCommentary} includeStaffNotes={false} />
      <Label htmlFor={id}>{t("reservation.note")}</Label>
      <Textarea
        id={id}
        maxLength={maxLength}
        placeholder={t("reservation.notePlaceholder")}
        aria-describedby={hintId}
        {...inputProps}
      />
      <p id={hintId} className="text-sm text-muted-foreground">{t("reservation.noteHint", { max: maxLength })}</p>
    </div>
  );
}
