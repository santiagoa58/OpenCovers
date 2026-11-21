import type { ComponentProps } from "react";
import { ReservationAnnotations } from "@/components/reservation/reservation-annotations";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n";

interface StaffNoteFieldProps extends ComponentProps<typeof Textarea> {
  id: string;
  maxLength: number;
  /** Imported references and rosters are read-only details, not editable notes. */
  bookingCommentary?: string | null;
}

/** Shared note field for both creating and editing reservations. */
export function StaffNoteField({ id, maxLength, bookingCommentary, ...textareaProps }: StaffNoteFieldProps) {
  const t = useT();
  return (
    <Field>
      {bookingCommentary && (
        <ReservationAnnotations commentary={bookingCommentary} includeStaffNotes={false} />
      )}
      <FieldLabel htmlFor={id}>{t("reservation.note")}</FieldLabel>
      <Textarea
        id={id}
        maxLength={maxLength}
        placeholder={t("reservation.notePlaceholder")}
        {...textareaProps}
      />
      <FieldDescription>
        {t("reservation.noteHint", { max: maxLength })}
      </FieldDescription>
    </Field>
  );
}
