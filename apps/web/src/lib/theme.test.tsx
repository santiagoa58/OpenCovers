import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <>
      <output data-testid="preference">{theme}</output>
      <output data-testid="resolved">{resolvedTheme}</output>
      <button onClick={() => setTheme("system")}>System</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("light")}>Light</button>
    </>
  );
}

function mockSystem(initial: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    matches: initial,
    addEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(media));
  return (dark: boolean) => {
    media.matches = dark;
    act(() => {
      for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent);
    });
  };
}

describe("device-aware theme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
  });

  it("defaults to the device and reacts when its appearance changes", async () => {
    const changeSystem = mockSystem(true);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    changeSystem(false);
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("preserves explicit overrides until System is selected again", async () => {
    const changeSystem = mockSystem(false);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    act(() => screen.getByText("Dark").click());
    expect(localStorage.getItem("theme")).toBe("dark");
    changeSystem(true);
    changeSystem(false);
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    act(() => screen.getByText("System").click());
    expect(localStorage.getItem("theme")).toBeNull();
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });

  it("hydrates a previously selected manual preference", () => {
    mockSystem(true);
    localStorage.setItem("theme", "light");
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId("preference")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });
});
