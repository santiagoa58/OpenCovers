import { useId, useState } from "react";
import { selfServiceUrl, type Created } from "./api";
import { formatDate } from "./dates";
import type { Translate } from "./messages";
import { inputClass, secondaryButton, Section } from "./ui";

export function Confirmation({ t, locale, created }: { t: Translate; locale: string; created: Created }) {
  const { reservation, selfServiceToken } = created;
  const [copied, setCopied] = useState(false);
  const ids = useId();
  const link = selfServiceToken ? selfServiceUrl(window.location.origin, selfServiceToken, locale) : null;
  const party = reservation.partySize === 1 ? t("field.partyOptionOne") : t("field.partyOption", { n: reservation.partySize });
  const copiedStatus = copied ? t("action.copied") : "";
  return (
    <Section title={t("done.title")} focus>
      <p>
        {t("done.body", {
          date: formatDate(reservation.date, locale),
          time: reservation.time,
          party,
          name: reservation.guest.name,
        })}
      </p>
      <p className="text-muted">{t("done.contact", { contact: reservation.guest.contact })}</p>
      {link ? (
        <div className="space-y-2 rounded-oc border border-border bg-surface p-3">
          <label htmlFor={`${ids}-link`} className="block font-medium">
            {t("done.linkTitle")}
          </label>
          <p id={`${ids}-link-hint`} className="text-sm text-muted">
            {t("done.linkBody")}
          </p>
          <input
            id={`${ids}-link`}
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            aria-describedby={`${ids}-link-hint`}
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                void navigator.clipboard?.writeText(link).then(() => setCopied(true));
              }}
            >
              {t("action.copy")}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="underline">
              {t("action.open")}
            </a>
            <span role="status" className="text-sm text-muted">
              {copiedStatus}
            </span>
          </div>
        </div>
      ) : (
        <p>{t("done.noLink")}</p>
      )}
    </Section>
  );
}
