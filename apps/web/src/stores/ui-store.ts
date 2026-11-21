import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isFloorSkinId, type FloorSkinId } from "@/components/floor/skins";
import { detectLocale, isLocale, type Locale } from "@/i18n/locales";

export type TimeFormat = "12h" | "24h";

interface UiState {
  venueId: string | null;
  setVenue: (venueId: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  floorSkin: FloorSkinId;
  setFloorSkin: (skin: FloorSkinId) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      venueId: null,
      setVenue: (venueId) => set({ venueId }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      floorSkin: "plano",
      setFloorSkin: (floorSkin) => set({ floorSkin }),
      locale: detectLocale(),
      setLocale: (locale) => set({ locale }),
      timeFormat: "24h",
      setTimeFormat: (timeFormat) => set({ timeFormat }),
    }),
    {
      name: "opencovers-ui",
      // A stored skin or language this build no longer has falls back to the default.
      merge: (stored, current) => {
        const merged = { ...current, ...(stored as Partial<UiState>) };
        return {
          ...merged,
          floorSkin: isFloorSkinId(merged.floorSkin) ? merged.floorSkin : current.floorSkin,
          locale: isLocale(merged.locale) ? merged.locale : current.locale,
          timeFormat: merged.timeFormat === "12h" || merged.timeFormat === "24h" ? merged.timeFormat : current.timeFormat,
        };
      },
    },
  ),
);
