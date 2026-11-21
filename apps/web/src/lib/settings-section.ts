import { readUrlParam, setUrlParams, subscribeUrl, type HistoryMode } from "@/lib/url-state";

/** Which Settings section contains each deep-link target from the dashboard. */
const TARGETS: Record<string, string> = {
  venue: "venue",
  online: "online",
  room: "room",
  developers: "developers",
  tables: "room",
  floor: "room",
  services: "room",
};

export const sectionForTarget = (target: string): string | undefined => TARGETS[target];
export const readSectionParam = (): string | null => readUrlParam("section");
export const setSectionParam = (id: string | null, mode: HistoryMode = "replace"): void =>
  setUrlParams({ section: id }, mode);
export const subscribeSectionParam = subscribeUrl;
