import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setUrlParams, useUrlDate, useUrlParam, useUrlPartySize, useUrlTime } from "./url-state";

describe("URL state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("hydrates dates, time and party size from the address after reload", () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-20&time=17%3A30&party=4");
    const { result, unmount } = renderHook(() => ({
      view: useUrlParam("view"),
      date: useUrlDate()[0],
      time: useUrlTime()[0],
      party: useUrlPartySize()[0],
    }));
    expect(result.current).toEqual({ view: "floor", date: "2026-11-20", time: "17:30", party: 4 });
    unmount();
    const reloaded = renderHook(() => useUrlDate());
    expect(reloaded.result.current[0]).toBe("2026-11-20");
  });

  it("updates multiple filters atomically and keeps unrelated URL parameters", () => {
    window.history.replaceState(null, "", "/?view=floor&section=room#invitation");
    const { result } = renderHook(() => [useUrlDate()[0], useUrlTime()[0]]);
    act(() => setUrlParams({ date: "2026-11-21", time: "18:15" }));
    expect(result.current).toEqual(["2026-11-21", "18:15"]);
    expect(window.location.search).toContain("view=floor");
    expect(window.location.search).toContain("section=room");
    expect(window.location.hash).toBe("#invitation");
  });

  it("subscribes to browser Back/Forward and ignores invalid filters", () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-20&time=17%3A30");
    const { result } = renderHook(() => ({
      view: useUrlParam("view"), date: useUrlDate()[0], time: useUrlTime()[0], party: useUrlPartySize()[0],
    }));
    act(() => setUrlParams({ view: "availability", party: "5" }));
    expect(result.current.view).toBe("availability");
    expect(result.current.party).toBe(5);
    act(() => {
      window.history.replaceState(null, "", "/?view=floor&date=2026-11-20&time=17%3A30");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current).toMatchObject({ view: "floor", date: "2026-11-20", time: "17:30", party: 2 });
    act(() => setUrlParams({ date: "2026-13-55", time: "35:55", party: "-5" }));
    expect(result.current.date).not.toBe("2026-13-55");
    expect(result.current.time).not.toBe("35:55");
    expect(result.current.party).toBe(2);
  });
  it("replaces time changes without stacking browser history entries", () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-21&time=16%3A30#main");
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useUrlTime());

    act(() => result.current[1]("16:45"));
    act(() => result.current[1]("16:46"));
    act(() => result.current[1]("17:00"));
    expect(result.current[0]).toBe("17:00");
    expect(new URLSearchParams(window.location.search).get("date")).toBe("2026-11-21");
    expect(window.location.hash).toBe("#main");
    expect(replace).toHaveBeenCalledTimes(3);
    expect(push).not.toHaveBeenCalled();

    act(() => result.current[1]("not-a-time"));
    expect(result.current[0]).toBe("17:00");
    expect(replace).toHaveBeenCalledTimes(3);
  });

  it("pins a missing time in the URL once rather than recalculating it on re-renders", async () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-21");
    const push = vi.spyOn(window.history, "pushState");
    const { result, rerender } = renderHook(() => useUrlTime());
    const initialTime = result.current[0];
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("time")).toBe(initialTime));
    rerender();
    expect(result.current[0]).toBe(initialTime);
    expect(push).not.toHaveBeenCalled();
    const reloaded = renderHook(() => useUrlTime());
    expect(reloaded.result.current[0]).toBe(initialTime);
  });

});
