import { useSyncExternalStore } from "react";
import { nowTime, todayIso } from "@/lib/date";

const EVENT = "opencovers:url-change";
export type HistoryMode = "push" | "replace";
export type UrlPatch = Record<string, string | null | undefined>;

/** One URL subscription for every screen, tab, and filter. Browser Back/Forward works without separate state stores. */
export function subscribeUrl(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function readUrlParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

export function useUrlParam(name: string): string | null {
  return useSyncExternalStore(subscribeUrl, () => readUrlParam(name), () => null);
}

/** Changes only the supplied keys; preserves unrelated query parameters and any invitation hash. */
export function setUrlParams(patch: UrlPatch, mode: HistoryMode = "push"): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  const next = url.pathname + url.search + url.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (next === current) return;
  window.history[mode === "push" ? "pushState" : "replaceState"](window.history.state, "", next);
  window.dispatchEvent(new Event(EVENT));
}

function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function useUrlDate(): [string, (date: string) => void] {
  const value = useUrlParam("date");
  return [validDate(value) ? value : todayIso(), (date) => {
    if (validDate(date)) setUrlParams({ date });
  }];
}

export function useUrlTime(): [string, (time: string) => void] {
  const value = useUrlParam("time");
  return [value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : nowTime(), (time) => {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) setUrlParams({ time });
  }];
}

export function useUrlPartySize(): [number, (partySize: number) => void] {
  const value = useUrlParam("party");
  const number = value && /^\d+$/.test(value) ? Number(value) : 2;
  const partySize = Number.isSafeInteger(number) && number >= 1 && number <= 1000 ? number : 2;
  return [partySize, (next) => {
    if (Number.isSafeInteger(next) && next >= 1 && next <= 1000) setUrlParams({ party: String(next) });
  }];
}
