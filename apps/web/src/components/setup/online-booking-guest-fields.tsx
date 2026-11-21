import { Group } from "./form-parts";
import { Chip } from "./online-booking-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n";
import { type OnlineBookingForm, type FormErrors } from "@/lib/online-booking";

export function OnlineBookingGuestFields({
  form,
  errors,
  tableZones,
  zonesReady,
  onChange,
}: {
  form: OnlineBookingForm;
  errors: FormErrors;
  tableZones: string[];
  zonesReady: boolean;
  onChange: (form: OnlineBookingForm) => void;
}) {
  const t = useT();
  const zoneOptions = [...tableZones, ...form.publicZones.filter((zone) => !tableZones.includes(zone))];
  const zonesLocked = tableZones.length < 2;
  function toggleZone(name: string, on: boolean) {
    onChange({
      ...form,
      publicZones: on ? [...new Set([...form.publicZones, name])] : form.publicZones.filter((value) => value !== name),
    });
  }
  function error(key: keyof FormErrors) {
    if (!errors[key]) return null;
    return <p id={`ob-${key}-error`} role="alert" className="text-sm text-destructive">{errors[key]}</p>;
  }
  const setForm = onChange;
  return (
    <>
            <Group title={t("onlinebooking.guest.title")} description={t("onlinebooking.guest.description")}>
              <fieldset className="space-y-2" disabled={zonesReady && zonesLocked && form.publicZones.length === 0}>
                <legend className="text-sm font-medium">{t("onlinebooking.zones.legend")}</legend>
                {zonesReady && zonesLocked && form.publicZones.length === 0 ? (
                  <p id="ob-zones-help" className="text-sm text-muted-foreground">
                    {t("onlinebooking.zones.fewer")}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2" aria-describedby="ob-zones-help">
                      {zoneOptions.map((name) => {
                        const unused = zonesReady && !tableZones.includes(name);
                        return (
                          <Chip
                            key={name}
                            checked={form.publicZones.includes(name)}
                            disabled={!zonesReady}
                            verbatim
                            onChange={(on) => toggleZone(name, on)}
                          >
                            {name}
                            {unused && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                ({t("onlinebooking.zones.unused")})
                              </span>
                            )}
                          </Chip>
                        );
                      })}
                    </div>
                    <p id="ob-zones-help" className="text-sm text-muted-foreground">
                      {t("onlinebooking.zones.help")}
                    </p>
                  </>
                )}
                {error("publicZones")}
              </fieldset>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="ob-service-names">{t("onlinebooking.serviceNames.label")}</Label>
                  <p className="text-sm text-muted-foreground">{t("onlinebooking.serviceNames.help")}</p>
                </div>
                <Switch
                  id="ob-service-names"
                  checked={form.showServiceNames}
                  onCheckedChange={(v) => setForm({ ...form, showServiceNames: v })}
                />
              </div>
            </Group>

            <Group title={t("onlinebooking.privacy.title")} description={t("onlinebooking.privacy.description")}>
              <div className="space-y-2">
                <Label htmlFor="ob-privacy-url">{t("onlinebooking.privacy.label")}</Label>
                <Input
                  id="ob-privacy-url"
                  inputMode="url"
                  placeholder="https://example.com/privacy" // i18n-ok
                  value={form.privacyNoticeUrl}
                  aria-invalid={errors.privacyNoticeUrl ? true : undefined}
                  aria-describedby={
                    errors.privacyNoticeUrl ? "ob-privacy-url-help ob-privacyNoticeUrl-error" : "ob-privacy-url-help"
                  }
                  onChange={(e) => setForm({ ...form, privacyNoticeUrl: e.target.value })}
                />
                {error("privacyNoticeUrl")}
                <p id="ob-privacy-url-help" className="text-sm text-muted-foreground">
                  {t("onlinebooking.privacy.help")}
                </p>
              </div>
            </Group>

            <Group title={t("onlinebooking.embedding.title")} description={t("onlinebooking.embedding.description")}>
              <div className="space-y-2">
                <Label htmlFor="ob-origins">{t("onlinebooking.origins.label")}</Label>
                <Textarea
                  id="ob-origins"
                  rows={3}
                  placeholder="https://example.com" // i18n-ok
                  value={form.allowedOrigins}
                  aria-invalid={errors.allowedOrigins ? true : undefined}
                  aria-describedby={errors.allowedOrigins ? "ob-allowedOrigins-error" : undefined}
                  onChange={(e) => setForm({ ...form, allowedOrigins: e.target.value })}
                />
                {error("allowedOrigins")}
                <p className="text-sm text-muted-foreground">
                  {t("onlinebooking.origins.help")}
                </p>
              </div>
            </Group>


    </>
  );
}
