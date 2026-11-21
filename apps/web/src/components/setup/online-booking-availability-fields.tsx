import { Group } from "./form-parts";
import { Chip } from "./online-booking-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n";
import { LOCALES, LOCALE_NAMES, type OnlineBookingForm, type FormErrors } from "@/lib/online-booking";
import { WEEKDAYS } from "@/lib/weekdays";

type NumberKey =
  | "minPartySize"
  | "maxPartySize"
  | "leadTimeMinutes"
  | "maxAdvanceDays"
  | "selfServiceCutoffMinutes"
  | "maxOpenBookingsPerContact";

export function OnlineBookingAvailabilityFields({
  form,
  errors,
  serviceNames,
  onChange,
}: {
  form: OnlineBookingForm;
  errors: FormErrors;
  serviceNames: string[];
  onChange: (form: OnlineBookingForm) => void;
}) {
  const t = useT();
  const setForm = onChange;
  function error(key: keyof FormErrors) {
    if (!errors[key]) return null;
    return <p id={`ob-${key}-error`} role="alert" className="text-sm text-destructive">{errors[key]}</p>;
  }
  function num(key: NumberKey) {
    return {
      value: form[key] ?? "",
      inputMode: "numeric" as const,
      "aria-invalid": errors[key] ? true : undefined,
      "aria-describedby": errors[key] ? `ob-${key}-error` : undefined,
      onChange: (e: { target: { value: string } }) => onChange({ ...form, [key]: e.target.value }),
    };
  }
  function toggleService(name: string, on: boolean) {
    const current = form.services ?? serviceNames;
    onChange({ ...form, services: on ? [...new Set([...current, name])] : current.filter((value) => value !== name) });
  }
  function toggleDay(day: number, on: boolean) {
    onChange({ ...form, weekdays: on ? [...new Set([...form.weekdays, day])] : form.weekdays.filter((value) => value !== day) });
  }
  return (
    <>
            <Group title={t("onlinebooking.what.title")} description={t("onlinebooking.what.description")}>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("onlinebooking.services.legend")}</legend>
                {serviceNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("onlinebooking.services.none")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {serviceNames.map((name) => (
                      <Chip
                        key={name}
                        checked={form.services === null || form.services.includes(name)}
                        onChange={(on) => toggleService(name, on)}
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                )}
                {error("services")}
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("onlinebooking.days.legend")}</legend>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <Chip
                      key={d.value}
                      checked={form.weekdays.includes(d.value)}
                      onChange={(on) => toggleDay(d.value, on)}
                    >
                      {d.short}
                    </Chip>
                  ))}
                </div>
                {error("weekdays")}
              </fieldset>
            </Group>

            <Group title={t("onlinebooking.party.title")} description={t("onlinebooking.party.description")}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-min">{t("onlinebooking.minParty")}</Label>
                  <Input id="ob-min" {...num("minPartySize")} />
                  {error("minPartySize")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-max">{t("onlinebooking.maxParty")}</Label>
                  <Input id="ob-max" {...num("maxPartySize")} />
                  {error("maxPartySize")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-lead">{t("onlinebooking.lead")}</Label>
                  <Input id="ob-lead" {...num("leadTimeMinutes")} />
                  {error("leadTimeMinutes")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-advance">{t("onlinebooking.horizon")}</Label>
                  <Input id="ob-advance" placeholder={t("onlinebooking.horizon.placeholder")} {...num("maxAdvanceDays")} />
                  {error("maxAdvanceDays")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-cutoff">{t("onlinebooking.cutoff")}</Label>
                  <Input id="ob-cutoff" {...num("selfServiceCutoffMinutes")} />
                  {error("selfServiceCutoffMinutes")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-open">{t("onlinebooking.open")}</Label>
                  <Input id="ob-open" placeholder={t("onlinebooking.open.placeholder")} {...num("maxOpenBookingsPerContact")} />
                  {error("maxOpenBookingsPerContact")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-locale">{t("common.language")}</Label>
                  <select
                    id="ob-locale"
                    value={form.locale}
                    onChange={(e) => setForm({ ...form, locale: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  >
                    {LOCALES.map((l) => (
                      <option key={l} value={l}>
                        {LOCALE_NAMES[l]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Group>


    </>
  );
}
