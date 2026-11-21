import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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
    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
  });

});
