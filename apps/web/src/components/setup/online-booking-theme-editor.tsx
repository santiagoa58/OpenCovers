import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT, type MessageKey } from "@/i18n";
import { COLOR_KEYS, FONTS, DEFAULT_DARK_COLORS, type ColorKey, type Font, type FormErrors, type ThemeForm } from "@/lib/online-booking";
import { ThemePreview } from "./online-booking-theme-preview";

const COLOR_LABELS: Record<ColorKey, MessageKey> = {
  primary: "onlinebooking.color.primary",
  onPrimary: "onlinebooking.color.onPrimary",
  background: "onlinebooking.color.background",
  surface: "onlinebooking.color.surface",
  text: "onlinebooking.color.text",
  muted: "onlinebooking.color.muted",
  border: "onlinebooking.color.border",
};

const FONT_LABELS: Record<Font, MessageKey> = {
  system: "onlinebooking.font.system",
  serif: "onlinebooking.font.serif",
  rounded: "onlinebooking.font.rounded",
};

function error(key: keyof FormErrors, errors: FormErrors) {
  if (!errors[key]) return null;
  return <p id={`ob-${key}-error`} role="alert" className="text-sm text-destructive">{errors[key]}</p>;
}

/** Appearance editor; no API access or saved form state of its own. */
export function OnlineBookingThemeEditor({
  theme,
  errors,
  lowContrast,
  lowContrastDark,
  onThemeChange,
  onReset,
}: {
  theme: ThemeForm;
  errors: FormErrors;
  lowContrast: number | null;
  lowContrastDark: number | null;
  onThemeChange: (patch: Partial<ThemeForm>) => void;
  onReset: () => void;
}) {
  const t = useT();
  return (
            <fieldset className="space-y-4">
              <legend className="font-display text-lg">{t("onlinebooking.look.legend")}</legend>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {COLOR_KEYS.map((k) => (
                      <div key={k} className="flex items-center gap-2">
                        <input
                          id={`ob-color-${k}`}
                          type="color"
                          value={theme.colors[k]}
                          onChange={(e) => onThemeChange({ colors: { ...theme.colors, [k]: e.target.value } })}
                          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent"
                        />
                        <Label htmlFor={`ob-color-${k}`} className="font-normal">
                          {t(COLOR_LABELS[k])}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {error("themeColors", errors)}
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="ob-dark-palette">{t("onlinebooking.dark.label")}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t("onlinebooking.dark.help")}
                        </p>
                      </div>
                      <Switch
                        id="ob-dark-palette"
                        checked={theme.darkColors !== null}
                        onCheckedChange={(on) =>
                          onThemeChange({ darkColors: on ? { ...DEFAULT_DARK_COLORS } : null })
                        }
                      />
                    </div>
                    {theme.darkColors && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {COLOR_KEYS.map((k) => (
                            <div key={k} className="flex items-center gap-2">
                              <input
                                id={`ob-dark-color-${k}`}
                                type="color"
                                value={theme.darkColors?.[k] ?? DEFAULT_DARK_COLORS[k]}
                                onChange={(e) =>
                                  onThemeChange({
                                    darkColors: { ...DEFAULT_DARK_COLORS, ...theme.darkColors, [k]: e.target.value },
                                  })
                                }
                                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent"
                              />
                              <Label htmlFor={`ob-dark-color-${k}`} className="font-normal">
                                {t("onlinebooking.dark.color", { color: t(COLOR_LABELS[k]).toLowerCase() })}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {error("themeDarkColors", errors)}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ob-dark-radius">{t("onlinebooking.dark.radius")}</Label>
                            <Input
                              id="ob-dark-radius"
                              inputMode="numeric"
                              placeholder={t("onlinebooking.sameAsLight")}
                              value={theme.darkRadius}
                              aria-invalid={errors.themeDarkRadius ? true : undefined}
                              aria-describedby={errors.themeDarkRadius ? "ob-themeDarkRadius-error" : undefined}
                              onChange={(e) => onThemeChange({ darkRadius: e.target.value })}
                            />
                            {error("themeDarkRadius", errors)}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ob-dark-font">{t("onlinebooking.dark.font")}</Label>
                            <select
                              id="ob-dark-font"
                              value={theme.darkFont}
                              onChange={(e) => onThemeChange({ darkFont: e.target.value as Font | "" })}
                              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                            >
                              <option value="">{t("onlinebooking.sameAsLight")}</option>
                              {FONTS.map((f) => (
                                <option key={f} value={f}>
                                  {t(FONT_LABELS[f])}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ob-radius">{t("onlinebooking.radius")}</Label>
                      <Input
                        id="ob-radius"
                        inputMode="numeric"
                        value={theme.radius}
                        aria-invalid={errors.themeRadius ? true : undefined}
                        aria-describedby={errors.themeRadius ? "ob-themeRadius-error" : undefined}
                        onChange={(e) => onThemeChange({ radius: e.target.value })}
                      />
                      {error("themeRadius", errors)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ob-font">{t("onlinebooking.font")}</Label>
                      <select
                        id="ob-font"
                        value={theme.font}
                        onChange={(e) => onThemeChange({ font: e.target.value as Font })}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                      >
                        {FONTS.map((f) => (
                          <option key={f} value={f}>
                            {t(FONT_LABELS[f])}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-logo">{t("onlinebooking.logo.label")}</Label>
                    <Input
                      id="ob-logo"
                      placeholder="https://example.com/logo.png" // i18n-ok
                      value={theme.logoUrl}
                      aria-invalid={errors.themeLogoUrl ? true : undefined}
                      aria-describedby={errors.themeLogoUrl ? "ob-themeLogoUrl-error" : undefined}
                      onChange={(e) => onThemeChange({ logoUrl: e.target.value })}
                    />
                    {error("themeLogoUrl", errors)}
                    <p className="text-sm text-muted-foreground">
                      {t("onlinebooking.logo.help")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                  >
                    {t("onlinebooking.resetLook")}
                  </Button>
                </div>
                <div className="space-y-3 sm:sticky sm:top-36 sm:self-start">
                  <ThemePreview theme={theme} />
                  {theme.darkColors && (
                    <ThemePreview
                      theme={theme}
                      colors={theme.darkColors}
                      radiusText={theme.darkRadius}
                      font={theme.darkFont || undefined}
                      label={t("onlinebooking.preview.darkLabel")}
                    />
                  )}
                </div>
              </div>
              {lowContrast !== null && (
                <div
                  role="alert"
                  className="rounded-md border border-amber-500/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                >
                  {t("onlinebooking.contrast.light", { ratio: lowContrast })}
                </div>
              )}
              {lowContrastDark !== null && (
                <div
                  role="alert"
                  className="rounded-md border border-amber-500/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                >
                  {t("onlinebooking.contrast.dark", { ratio: lowContrastDark })}
                </div>
              )}
            </fieldset>



  );
}
