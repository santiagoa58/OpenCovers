import { Pill, type PillTone } from "@/components/pill";
import { useT, type MessageKey } from "@/i18n";
import type { Reconfirmation } from "@/lib/api";

const RECONFIRMATION: Record<Exclude<Reconfirmation, "none">, { labelKey: MessageKey; tone: PillTone }> = {
  requested: { labelKey: "preshift.reconfirmation.requested", tone: "info" },
  confirmed: { labelKey: "preshift.reconfirmation.confirmed", tone: "success" },
  declined: { labelKey: "preshift.reconfirmation.declined", tone: "danger" },
  no_answer: { labelKey: "preshift.reconfirmation.noAnswer", tone: "warning" },
};


export function ReconfirmationPill({ value }: { value: Reconfirmation | undefined }) {
  const t = useT();
  if (!value || value === "none") return null;
  const r = RECONFIRMATION[value];
  return <Pill tone={r.tone}>{t(r.labelKey)}</Pill>;
}

