import type { ComponentProps } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
    <Field>
      <ReservationAnnotations commentary={originalCommentary} includeStaffNotes={false} />
      <FieldLabel htmlFor={id}>{t("reservation.note")}</FieldLabel>
      <Textarea
        id={id}
        maxLength={maxLength}
        placeholder={t("reservation.notePlaceholder")}
        aria-describedby={hintId}
        {...inputProps}
      />
      <FieldDescription id={hintId}>{t("reservation.noteHint", { max: maxLength })}</FieldDescription>
    </Field>
  );
}
