import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FloorTable } from "@/lib/api";
import { mockApi, renderWithApp, resetApiMocks } from "@/test/mock-api";
import { todayIso } from "@/lib/date";
import { FloorView } from "./floor-view";

function table(overrides: Partial<FloorTable> = {}): FloorTable {
  return {
    id: "t1",
    name: "Table 1",
    seats: 2,
    zone: "",
    shape: "round",
    posX: 0,
    posY: 0,
    rotation: 0,
    occupied: false,
    ...overrides,
  };
}

const FLOOR = "GET /v1/venues/v1/floor";
const ITEMS = "GET /v1/venues/v1/floor-items";

function setup(tables: FloorTable[]) {
  mockApi({
    [FLOOR]: { body: { tables } },
    [ITEMS]: { body: { items: [] } },
    "GET /v1/venues/v1/agenda": { body: { reservations: [] } },
    "GET /v1/venues/v1/tables": { body: { tables: [] } },
    "GET /v1/venues/v1/pacing": { body: { pacing: [
      { service: "Dinner", slots: [
        { time: "16:30", capacity: 10, covers: 2 },
        { time: "16:45", capacity: 10, covers: 6 },
      ] },
    ] } },
  });
  renderWithApp(<FloorView venueId="v1" />);
  return userEvent.setup();
}

describe("FloorView", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
    resetApiMocks();
    vi.restoreAllMocks();
  });

  it("counts free and occupied tables and the guests seated", async () => {
    setup([
      table(),
      table({ id: "t2", name: "Table 2", posX: 100 }),
      table({
        id: "t3",
        name: "Table 3",
        posX: 200,
        occupied: true,
        reservationId: "r1",
        guestName: "Ana",
        partySize: 4,
      }),
    ]);
    expect(await screen.findByText("4 guests with tables reserved")).toBeInTheDocument();
    expect(screen.getByText("Free").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Reserved").nextElementSibling).toHaveTextContent("1");
  });

  it("marks page controls, pacing and the floor as print-hidden, preserving the briefing", async () => {
    setup([table()]);
    const heading = await screen.findByRole("heading", { name: "Reservation details" });
    const details = heading.closest("section");
    expect(details).toHaveAttribute("data-print-target", "reservation-details");
    expect(details).not.toHaveClass("print:hidden");
    expect(screen.getByTestId("floor-controls")).toHaveClass("print:hidden");
    expect(screen.getByTestId("floor-pacing")).toHaveClass("print:hidden");
    expect(screen.getByTestId("floor-room")).toHaveClass("print:hidden");
  });

  it("clicking a busy timeline slot selects that time on the floor", async () => {
    const user = setup([table()]);
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    const slot = await screen.findByTestId("floor-slot-16:45");
    await user.click(slot);
    expect(slot).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("16");
    expect(screen.getByRole("combobox", { name: "Time minute" })).toHaveValue("45");
    expect(window.location.search).toContain("time=16%3A45");
    expect(screen.getByText("Viewing 16:45")).toBeInTheDocument();
    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("updates reservation details when the selected Pacing time changes", async () => {
    mockApi({
      [FLOOR]: { body: { tables: [table()] } },
      [ITEMS]: { body: { items: [] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [{ service: "Dinner", slots: [
        { time: "16:30", capacity: 10, covers: 2 },
        { time: "16:45", capacity: 10, covers: 2 },
      ] }] } },
      "GET /v1/venues/v1/agenda": { body: { reservations: [
        { id: "r1", date: "2026-11-21", status: "booked", time: "16:30", partySize: 2, service: "Dinner", guest: { name: "First Guest" } },
        { id: "r2", date: "2026-11-21", status: "booked", time: "16:45", partySize: 2, service: "Dinner", guest: { name: "Later Guest" } },
      ] } },
    });
    renderWithApp(<FloorView venueId="v1" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("floor-slot-16:30"));
    expect(await screen.findByText("First Guest")).toBeInTheDocument();
    expect(screen.queryByText("Later Guest")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("floor-slot-16:45"));
    expect(await screen.findByText("Later Guest")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("First Guest")).not.toBeInTheDocument());
  });

  it("includes bookings occupying tables from an earlier arrival", async () => {
    mockApi({
      [FLOOR]: { body: { tables: [table({ occupied: true, reservationId: "r1", guestName: "Guest", partySize: 2 })] } },
      [ITEMS]: { body: { items: [] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [{ service: "Dinner", slots: [
        { time: "16:30", capacity: 10, covers: 2 },
        { time: "16:45", capacity: 10, covers: 2 },
      ] }] } },
      "GET /v1/venues/v1/agenda": { body: { reservations: [
        { id: "r1", date: "2026-11-21", status: "booked", time: "16:30", partySize: 2, service: "Dinner", guest: { name: "Guest" }, commentary: "Peanut allergy" },
      ] } },
    });
    renderWithApp(<FloorView venueId="v1" />);
    await userEvent.click(await screen.findByTestId("floor-slot-16:45"));
    expect(await screen.findByText("Peanut allergy")).toBeInTheDocument();
  });

  it("seats a walk-in at a free table from the keyboard", async () => {
    const user = setup([table()]);
    const free = await screen.findByRole("button", { name: "Table 1, 2 seats, seat a walk-in" });
    free.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByLabelText("Guest name")).toBeInTheDocument();
  });

  it("does not offer walk-in seating on an occupied table and names who is there", async () => {
    setup([table({ occupied: true, reservationId: "r1", guestName: "Ana", partySize: 2 })]);
    expect(await screen.findByLabelText("Table 1: Ana, 2 guests")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Seat a walk-in/ })).not.toBeInTheDocument();
  });

  describe("moving a seated reservation without dragging", () => {
    const seated = table({
      occupied: true,
      reservationId: "r1",
      guestName: "Ana",
      partySize: 4,
    });
    const tables = [
      seated,
      table({ id: "t2", name: "Table 2", seats: 2, posX: 100 }),
      table({ id: "t3", name: "Table 3", seats: 6, posX: 200 }),
      table({ id: "t4", name: "Table 4", seats: 4, posX: 300 }),
    ];
    const RESERVATION = {
      id: "r1",
      guest: { name: "Ana", contact: "ana@example.com" },
      partySize: 4,
      date: "2026-11-18",
      time: "20:00",
      service: "dinner",
      status: "booked",
      tables: ["t1"],
      bookedVia: "staff",
    };

    function setupMove(list: FloorTable[]) {
      const api = mockApi({
        [FLOOR]: { body: { tables: list } },
        [ITEMS]: { body: { items: [] } },
        "GET /v1/venues/v1/agenda": { body: { reservations: [] } },
        "GET /v1/venues/v1/tables": { body: { tables: [] } },
        "GET /v1/venues/v1/reservations/r1": { body: RESERVATION },
        "POST /v1/venues/v1/reservations/r1/modify": { body: RESERVATION },
      });
      renderWithApp(<FloorView venueId="v1" />);
      return { api, user: userEvent.setup() };
    }

    async function openMove() {
      const node = await screen.findByLabelText("Table 1: Ana, 4 guests");
      act(() => node.focus());
      fireEvent.click(await screen.findByRole("button", { name: "Move to…" }));
    }

    it("opens from the card's Move to… button and lists free tables that fit first", async () => {
      setupMove(tables);
      await openMove();
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Move Ana")).toBeInTheDocument();
      const names = within(dialog)
        .getAllByRole("button", { name: /^Move to / })
        .map((b) => b.getAttribute("aria-label"));
      expect(names).toEqual(["Move to Table 4", "Move to Table 3", "Move to Table 2"]);
      expect(within(dialog).getByText("2 seats, too small")).toBeInTheDocument();
    });

    it("opens after a tap on a touch screen", async () => {
      setupMove(tables);
      const node = await screen.findByLabelText("Table 1: Ana, 4 guests");
      fireEvent.pointerDown(node, { pointerType: "touch" });
      fireEvent.click(node);
      fireEvent.click(await screen.findByRole("button", { name: "Move to…" }));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("moves the reservation to the chosen table and closes", async () => {
      const { api, user } = setupMove(tables);
      await openMove();
      await user.click(await screen.findByRole("button", { name: "Move to Table 3" }));
      await waitFor(() =>
        expect(api.calls("POST", "/v1/venues/v1/reservations/r1/modify")).toHaveLength(1),
      );
      expect(api.calls("POST", "/v1/venues/v1/reservations/r1/modify")[0].body).toEqual({
        tables: ["t3"],
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("says so when no table is free", async () => {
      setupMove([seated, table({ id: "t2", name: "Table 2", occupied: true, reservationId: "r2" })]);
      await openMove();
      expect(await screen.findByText("There are no free tables right now.")).toBeInTheDocument();
    });

    it("does not offer Move to… on a free table", async () => {
      const { user } = setupMove(tables);
      await user.click(await screen.findByRole("button", { name: "Table 2, 2 seats, seat a walk-in" }));
      expect(await screen.findByLabelText("Guest name")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Move to…" })).not.toBeInTheDocument();
    });
  });

  it("shows the empty state when there are no tables", async () => {
    setup([]);
    expect(await screen.findByText("No tables yet")).toBeInTheDocument();
  });
  it("restores the selected day and booking-load time from a shared URL", async () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-20&time=16%3A45");
    setup([table()]);
    expect(await screen.findByTestId("floor-slot-16:45")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-20");
    expect(screen.getByRole("combobox", { name: "Time hour" })).toHaveValue("16");
    expect(screen.getByRole("combobox", { name: "Time minute" })).toHaveValue("45");
  });

  it("gives date and time their own responsive toolbar without squeezing the page title", async () => {
    setup([table()]);
    await screen.findByRole("heading", { name: "Booking load" });
    const toolbar = screen.getByTestId("floor-filter-bar");
    expect(toolbar).toHaveClass("flex-col", "sm:flex-row", "min-w-0");
    expect(screen.getByLabelText("Date").parentElement).toHaveClass("w-full", "min-w-0", "sm:w-auto");
    const timePicker = screen.getByRole("group", { name: "Time" });
    expect(timePicker).toHaveClass("border", "rounded-md");
    expect(screen.getByRole("button", { name: "Now" })).toBeInTheDocument();
  });

  it("keeps off-slot time selections aligned across the timeline, floor query and reservation details", async () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-21&time=16%3A46");
    const api = mockApi({
      [FLOOR]: { body: { tables: [table()] } },
      [ITEMS]: { body: { items: [] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [{ service: "Dinner", slots: [
        { time: "16:30", capacity: 10, covers: 2 },
        { time: "16:45", capacity: 10, covers: 2 },
        { time: "17:00", capacity: 10, covers: 0 },
      ] }] } },
      "GET /v1/venues/v1/agenda": { body: { reservations: [
        { id: "early", date: "2026-11-21", status: "booked", time: "16:30", partySize: 2, service: "Dinner", guest: { name: "Early Guest" } },
        { id: "late", date: "2026-11-21", status: "booked", time: "16:45", partySize: 2, service: "Dinner", guest: { name: "Later Guest" } },
      ] } },
    });
    renderWithApp(<FloorView venueId="v1" />);
    const user = userEvent.setup();
    const slot = await screen.findByTestId("floor-slot-16:45");
    expect(slot).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Time minute" })).toHaveValue("46");
    expect(screen.getByTestId("floor-selected-time")).toHaveTextContent("Viewing 16:46");
    expect(await screen.findByText("Later Guest")).toBeInTheDocument();
    expect(screen.queryByText("Early Guest")).not.toBeInTheDocument();
    expect(api.calls("GET", "/v1/venues/v1/floor").some((r) => r.path.includes("time=16:46"))).toBe(true);

    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    await user.selectOptions(screen.getByRole("combobox", { name: "Time minute" }), "30");
    expect(await screen.findByText("Early Guest")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Later Guest")).not.toBeInTheDocument());
    expect(screen.getByTestId("floor-slot-16:30")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("floor-selected-time")).toHaveTextContent("Viewing 16:30");
    expect(api.calls("GET", "/v1/venues/v1/floor").some((r) => r.path.includes("time=16:30"))).toBe(true);
    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("uses replaceState to jump to Now while updating the shared date and time", async () => {
    window.history.replaceState(null, "", "/?view=floor&date=2026-11-20&time=16%3A30");
    setup([table()]);
    const user = userEvent.setup();
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    await user.click(screen.getByRole("button", { name: "Now" }));
    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    const params = new URLSearchParams(window.location.search);
    expect(params.get("date")).toBe(todayIso());
    expect(params.get("time")).toMatch(/^([01]\\d|2[0-3]):[0-5]\\d$/);
    expect(screen.getByTestId("floor-selected-time")).toHaveTextContent("Viewing");
  });

});
