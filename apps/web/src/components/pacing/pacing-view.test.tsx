import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PacingView } from "./pacing-view";
import { useUiStore } from "@/stores/ui-store";

function mockPacing(pacing: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ pacing }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PacingView venueId="v1" date="2026-11-21" time="20:00" onSelectTime={() => {}} />
    </QueryClientProvider>,
  );
}

describe("PacingView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useUiStore.setState({ timeFormat: "24h" });
  });

  it("shows covers against capacity for each slot of a service", async () => {
    const fetchMock = mockPacing([
      {
        service: "dinner",
        slots: [
          { time: "20:00", capacity: 10, covers: 4 },
          { time: "20:15", capacity: 10, covers: 0 },
        ],
      },
    ]);
    renderView();

    expect(await screen.findByText("4/10")).toBeInTheDocument();
    expect(screen.getByText("0/10")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "dinner" })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /^\/v1\/venues\/v1\/pacing\?date=2026-11-21$/,
    );
  });

  it("tells the host to configure services when there are none", async () => {
    mockPacing([]);
    renderView();

    expect(await screen.findByText("No services configured")).toBeInTheDocument();
  });

  it("names the peak slot of a service and says so when nothing is booked", async () => {
    mockPacing([
      { service: "lunch", slots: [{ time: "13:00", capacity: 10, covers: 2 }, { time: "13:15", capacity: 4, covers: 4 }] },
      { service: "dinner", slots: [{ time: "20:00", capacity: 10, covers: 0 }] },
    ]);
    renderView();

    expect(await screen.findByText("Peak 4/4 at 13:15")).toBeInTheDocument();
    expect(screen.getByText("Nothing booked yet")).toBeInTheDocument();
  });
  it("uses the configured 12-hour time everywhere including tooltips", async () => {
    useUiStore.setState({ timeFormat: "12h" });
    mockPacing([{ service: "dinner", slots: [{ time: "20:00", capacity: 10, covers: 4 }] }]);
    renderView();
    expect(await screen.findByText("Peak 4/10 at 8:00 PM")).toBeInTheDocument();
    expect(screen.getByText("8:00 PM")).toBeInTheDocument();
    expect(screen.getByTitle("8:00 PM — 4/10 covers")).toBeInTheDocument();
    expect(screen.getByText("8:00 PM")).toHaveClass("whitespace-nowrap");
    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
  });

  it("keeps a long service in a single horizontal strip instead of wrapping each hour", async () => {
    const slots = Array.from({ length: 16 }, (_, i) => ({
      time: `${String(15 + Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
      capacity: 100,
      covers: 10 + i,
    }));
    mockPacing([{ service: "dinner", slots }]);
    renderView();
    const strip = await screen.findByRole("region", { name: /Booking load for dinner/ });
    expect(strip).toHaveClass("overflow-x-auto", "snap-x", "overscroll-x-contain");
    expect(strip.querySelectorAll('[data-testid^="floor-slot-"]')).toHaveLength(16);
    expect(strip.querySelectorAll('[data-testid^="floor-slot-"]')[0]).toHaveClass("shrink-0", "snap-start");
    expect(screen.getByText("18:45")).toBeInTheDocument();
    expect(screen.getByText("Swipe sideways to see other times")).toBeInTheDocument();
  });

  it("offers keyboard-accessible previous and next controls for horizontal scrolling", async () => {
    mockPacing([{ service: "dinner", slots: [
      { time: "20:00", capacity: 100, covers: 20 },
      { time: "20:15", capacity: 100, covers: 24 },
    ] }]);
    renderView();
    const strip = await screen.findByRole("region", { name: /Booking load for dinner/ });
    Object.defineProperty(strip, "scrollWidth", { configurable: true, value: 900 });
    Object.defineProperty(strip, "clientWidth", { configurable: true, value: 300 });
    fireEvent.scroll(strip);
    const earlier = screen.getByRole("button", { name: "Earlier times" });
    const later = screen.getByRole("button", { name: "Later times" });
    expect(earlier).toBeDisabled();
    expect(later).toBeEnabled();
    fireEvent.click(later);
    expect(strip.scrollLeft).toBeGreaterThan(0);
    expect(earlier).toBeEnabled();
  });

  it("highlights the active booking-load slot for a time between slot boundaries", async () => {
    mockPacing([{ service: "dinner", slots: [
      { time: "20:00", covers: 4, capacity: 10 },
      { time: "20:15", covers: 6, capacity: 10 },
    ] }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PacingView venueId="v1" date="2026-11-21" time="20:17" onSelectTime={() => {}} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("floor-slot-20:15")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("floor-slot-20:00")).toHaveAttribute("aria-pressed", "false");
  });

});
