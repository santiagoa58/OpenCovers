import { useT } from "@/i18n";
import { FONT_STACKS, isLogoUrl, type Font, type ThemeForm } from "@/lib/online-booking";

/**
 * A small likeness of the booking page. The staff app's CSP loads no image from other sites, so a valid logo
 * address shows as a placeholder here and loads only in the widget.
 */
export function ThemePreview({
  theme,
  colors,
  radiusText,
  font,
  label,
}: {
  theme: ThemeForm;
  colors?: ThemeForm["colors"];
  /** Overrides the corner radius, as text. Empty or absent keeps the theme's. */
  radiusText?: string;
  /** Overrides the font. Absent keeps the theme's. */
  font?: Font;
  label?: string;
}) {
  const t = useT();
  const c = colors ?? theme.colors;
  const radius = `${Math.min(24, Math.max(0, Number(radiusText?.trim() ? radiusText : theme.radius) || 0))}px`;
  return (
    <div
      aria-label={label ?? t("onlinebooking.preview.label")}
      role="img"
      className="space-y-3 border p-4 text-sm"
      style={{ background: c.background, color: c.text, fontFamily: FONT_STACKS[font ?? theme.font], borderColor: c.border, borderRadius: radius }}
    >
      {isLogoUrl(theme.logoUrl.trim()) && (
        <div className="flex h-8 w-20 items-center justify-center border border-dashed text-xs" style={{ borderColor: c.border, color: c.muted }}>
          {t("onlinebooking.preview.logo")}
        </div>
      )}
      <p className="text-base font-semibold">{t("onlinebooking.preview.title")}</p>
      <p style={{ color: c.muted }}>{t("onlinebooking.preview.pick")}</p>
      <div className="border px-3 py-2" style={{ background: c.surface, borderColor: c.border, borderRadius: radius }}>
        {t("onlinebooking.preview.sample", { count: 2 })}
      </div>
      <div className="px-3 py-2 text-center font-medium" style={{ background: c.primary, color: c.onPrimary, borderRadius: radius }}>
        {t("onlinebooking.preview.book")}
      </div>
    </div>
  );
}

