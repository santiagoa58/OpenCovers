import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Reservation } from "@/lib/api";
import { mockApi, renderWithApp, resetApiMocks } from "@/test/mock-api";
import { PreShiftView } from "./pre-shift-view";

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    venueId: "v1",
    date: "2026-11-20",
    time: "20:30",
    service: "dinner",
    partySize: 2,
    status: "booked",
    version: 1,
    bookedVia: "staff",
    guest: { name: "Jane Doe", contact: "jane@example.com", consent: "granted" },
    ...overrides,
  };
}

function setup(reservations: Reservation[], waitlist: unknown[] = []) {
  mockApi({
    "GET /v1/venues/v1/agenda": { body: { reservations } },
    "GET /v1/venues/v1/tables": { body: { tables: [] } },
    "GET /v1/venues/v1/services": { body: { services: [] } },
    "GET /v1/venues/v1/waitlist": { body: { entries: waitlist } },
  });
  renderWithApp(<PreShiftView venueId="v1" date="2026-11-20" time="20:30" floorTables={[]} />);
}

describe("PreShiftView", () => {
  afterEach(resetApiMocks);

  it("summarizes the shift and flags large parties and notes", async () => {
    setup([
      reservation({ id: "a", guest: { name: "Ana", consent: "granted" }, commentary: "Nut allergy" }),
      reservation({ id: "b", time: "20:30", partySize: 8, guest: { name: "Big Group", consent: "unknown" } }),
      reservation({ id: "c", status: "cancelled", guest: { name: "Gone", consent: "unknown" } }),
    ]);
    await screen.findByText("Ana");
    expect(screen.queryByText("Gone")).not.toBeInTheDocument();
    expect(screen.getByText("Reservations").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Covers").nextElementSibling).toHaveTextContent("10");
    expect(screen.getByText("Large parties (6+)").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("With notes").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("8 large")).toBeInTheDocument();
    expect(screen.getByText("Nut allergy")).toBeInTheDocument();
  });

  it("marks a booking without tables as unassigned and shows the reconfirmation state", async () => {
    setup([reservation({ reconfirmation: "declined" })]);
    expect(await screen.findByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Declined")).toBeInTheDocument();
  });

  it("does not show the live waitlist for an arbitrary selected floor time", async () => {
    setup(
      [reservation()],
      [{ id: "w1", venueId: "v1", partySize: 3, zone: "Patio", guestName: "Waiting Wes", status: "waiting" }],
    );
    await screen.findByText("Jane Doe");
    expect(screen.queryByText("Waiting Wes")).not.toBeInTheDocument();
  });

  it("says when nobody is expected", async () => {
    setup([]);
    expect(await screen.findByText("No matching reservations")).toBeInTheDocument();
  });

  it("loads an overnight occupied booking from the prior day and preserves its notes", async () => {
    const api = mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [] } },
      "GET /v1/venues/v1/tables": { body: { tables: [{ id: "t1", name: "Window 1" }] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [] } },
      "GET /v1/venues/v1/reservations/overnight": { body: reservation({
        id: "overnight",
        date: "2026-11-20",
        time: "23:30",
        partySize: 8,
        tables: ["t1"],
        commentary: "Severe nut allergy",
        reconfirmation: "confirmed",
        guest: { name: "Overnight Guest", consent: "unknown" },
      }) },
    });
    renderWithApp(
      <PreShiftView
        venueId="v1"
        date="2026-11-21"
        time="00:15"
        floorTables={[{
          id: "t1", name: "Window 1", seats: 8, zone: "", shape: "round",
          posX: 0, posY: 0, rotation: 0, occupied: true, reservationId: "overnight",
        }]}
      />,
    );

    expect(await screen.findByText("Overnight Guest")).toBeInTheDocument();
    expect(screen.getByText("Severe nut allergy")).toBeInTheDocument();
    expect(screen.getByText("8 large")).toBeInTheDocument();
    expect(screen.getByText("Reconfirmed")).toBeInTheDocument();
    expect(screen.getByText("Window 1")).toBeInTheDocument();
    expect(screen.getByText("Friday, November 20")).toBeInTheDocument();
    expect(screen.queryByText("No matching reservations")).not.toBeInTheDocument();
    expect(api.calls("GET", "/v1/venues/v1/reservations/overnight")).toHaveLength(1);
    expect(api.calls("GET", "/v1/venues/v1/agenda")[0].path).toContain("date=2026-11-21");
  });

  it("fetches each missing occupied reservation once even if it spans multiple tables", async () => {
    const api = mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [] } },
      "GET /v1/venues/v1/reservations/overnight": { body: reservation({
        id: "overnight", date: "2026-11-20", time: "23:30", partySize: 7,
        guest: { name: "Spanning Tables" },
      }) },
    });
    renderWithApp(
      <PreShiftView
        venueId="v1"
        date="2026-11-21"
        time="00:15"
        floorTables={["t1", "t2"].map((id) => ({
          id, name: id, seats: 4, zone: "", shape: "round",
          posX: 0, posY: 0, rotation: 0, occupied: true, reservationId: "overnight",
        }))}
      />,
    );
    expect(await screen.findByText("Spanning Tables")).toBeInTheDocument();
    expect(screen.getByText("Reservations").nextElementSibling).toHaveTextContent("1");
    expect(api.calls("GET", "/v1/venues/v1/reservations/overnight")).toHaveLength(1);
  });

  it("shows a retryable error rather than an empty state if occupied details cannot load", async () => {
    const api = mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [] } },
      "GET /v1/venues/v1/reservations/missing": { status: 503, body: { code: "transient" } },
    });
    renderWithApp(
      <PreShiftView
        venueId="v1"
        date="2026-11-21"
        time="00:15"
        floorTables={[{
          id: "t1", name: "Table 1", seats: 2, zone: "", shape: "round",
          posX: 0, posY: 0, rotation: 0, occupied: true, reservationId: "missing",
        }]}
      />,
    );
    expect(await screen.findByText("Could not load reservation details")).toBeInTheDocument();
    expect(screen.queryByText("No matching reservations")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    expect(api.calls("GET", "/v1/venues/v1/reservations/missing")).toHaveLength(1);
    await (await import("@testing-library/user-event")).default.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(api.calls("GET", "/v1/venues/v1/reservations/missing").length).toBeGreaterThan(1));
  });

  it("prints only when reservation details are ready", async () => {
    setup([reservation()]);
    const print = vi.fn();
    vi.stubGlobal("print", print);
    await screen.findByText("Jane Doe");
    await (await import("@testing-library/user-event")).default.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Reservation details" }).closest("section"))
      .toHaveAttribute("data-print-target", "reservation-details");
  });

  it("uses the Floor plan's date and time without duplicate controls", async () => {
    setup([reservation()]);
    await screen.findByText("Jane Doe");
    expect(screen.queryByRole("button", { name: "Next day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Service" })).not.toBeInTheDocument();
  });
});
