import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockApi, renderWithApp, resetApiMocks } from "@/test/mock-api";
import { useUiStore } from "@/stores/ui-store";
import type { Reservation } from "@/lib/api";
import { PrintReservationsDialog } from "./print-reservations-dialog";

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "a",
    venueId: "v1",
    date: "2026-11-20",
    time: "19:00",
    service: "Dinner",
    partySize: 2,
    status: "booked",
    version: 1,
    bookedVia: "staff",
    guest: { name: "Ana", contact: "ana@example.com" },
    tables: ["t1"],
    ...overrides,
  };
}

function printable(): HTMLElement {
  const sheet = document.querySelector<HTMLElement>("[data-reservation-print-root]");
  if (!sheet) throw new Error("Missing isolated print sheet");
  return sheet;
}

describe("PrintReservationsDialog", () => {
  afterEach(() => {
    window.dispatchEvent(new Event("afterprint"));
    resetApiMocks();
    useUiStore.setState({ locale: "en", timeFormat: "24h" });
  });

  it("prints a whole day, a single service, or cancelled bookings as requested", async () => {
    useUiStore.setState({ locale: "en", timeFormat: "12h" });
    mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [
        reservation({ id: "a", guest: { name: "Ana" }, commentary: "Peanut allergy" }),
        reservation({ id: "b", time: "13:00", service: "Lunch", status: "attended", guest: { name: "Bob" }, partySize: 4 }),
        reservation({ id: "c", time: "21:00", status: "cancelled", guest: { name: "Cancelled Guest" } }),
      ] } },
      "GET /v1/venues/v1/tables": { body: { tables: [{ id: "t1", name: "Window 1" }] } },
    });
    renderWithApp(<PrintReservationsDialog venueId="v1" date="2026-11-20" onClose={() => {}} />);
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "Print list" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByRole("radio", { name: "Full day" })).toBeChecked();
    expect(printable()).toHaveTextContent("Ana");
    expect(printable()).toHaveTextContent("Bob");
    expect(printable()).not.toHaveTextContent("Cancelled Guest");
    expect(printable()).toHaveTextContent("Peanut allergy");
    expect(printable()).toHaveTextContent("Window 1");
    expect(printable()).toHaveTextContent("7:00 PM");

    await user.click(screen.getByRole("radio", { name: "One service" }));
    expect(screen.getByRole("combobox", { name: "Choose service" })).toHaveValue("Dinner");
    expect(printable()).toHaveTextContent("Ana");
    expect(printable()).not.toHaveTextContent("Bob");
    await user.selectOptions(screen.getByRole("combobox", { name: "Choose service" }), "Lunch");
    expect(printable()).toHaveTextContent("Bob");
    expect(printable()).not.toHaveTextContent("Ana");

    await user.click(screen.getByRole("radio", { name: "Full day" }));
    await user.click(screen.getByRole("checkbox", { name: "Include cancelled and no-show reservations" }));
    expect(printable()).toHaveTextContent("Cancelled Guest");
    await user.click(screen.getByRole("checkbox", { name: "Include guest notes" }));
    expect(printable()).not.toHaveTextContent("Peanut allergy");

    const print = vi.fn();
    vi.stubGlobal("print", print);
    await user.click(button);
    expect(print).toHaveBeenCalledOnce();
    expect(document.body).toHaveClass("reservation-print-active");
    window.dispatchEvent(new Event("afterprint"));
    expect(document.body).not.toHaveClass("reservation-print-active");
  });

  it("loads exactly the chosen time snapshot and prior-day bookings holding tables", async () => {
    const api = mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [
        reservation({ id: "arrival", date: "2026-11-21", time: "00:15", partySize: 3, guest: { name: "Arriving Now" } }),
        reservation({ id: "later", date: "2026-11-21", time: "00:45", guest: { name: "Later Guest" } }),
      ] } },
      "GET /v1/venues/v1/tables": { body: { tables: [{ id: "t1", name: "Window 1" }] } },
      "GET /v1/venues/v1/floor": { body: { tables: [
        { id: "t1", name: "Window 1", occupied: true, reservationId: "overnight" },
      ] } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [
        { service: "Dinner", slots: [
          { time: "00:15", capacity: 10, covers: 3 },
          { time: "00:30", capacity: 10, covers: 3 },
        ] },
      ] } },
      "GET /v1/venues/v1/reservations/overnight": { body: reservation({
        id: "overnight",
        date: "2026-11-20",
        time: "23:30",
        guest: { name: "Earlier Arrival" },
        commentary: "Nut allergy",
      }) },
    });
    renderWithApp(
      <PrintReservationsDialog
        venueId="v1" date="2026-11-21" initialScope="time" initialTime="00:15"
        onClose={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Print list" })).toBeEnabled());
    expect(screen.getByRole("radio", { name: "Selected time" })).toBeChecked();
    expect(printable()).toHaveTextContent("Arriving Now");
    expect(printable()).toHaveTextContent("Earlier Arrival");
    expect(printable()).toHaveTextContent("Nut allergy");
    expect(printable()).not.toHaveTextContent("Later Guest");
    expect(api.calls("GET", "/v1/venues/v1/floor")[0].path).toContain("date=2026-11-21&time=00:15");
    expect(api.calls("GET", "/v1/venues/v1/reservations/overnight")).toHaveLength(1);
  });

  it("blocks incomplete time reports but allows switching to the full day", async () => {
    mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [reservation()] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
      "GET /v1/venues/v1/floor": { status: 503, body: { code: "transient" } },
      "GET /v1/venues/v1/pacing": { body: { pacing: [] } },
    });
    renderWithApp(
      <PrintReservationsDialog
        venueId="v1" date="2026-11-20" initialScope="time" initialTime="19:00"
        onClose={() => {}}
      />,
    );
    const user = userEvent.setup();
    expect(await screen.findByText("Could not load reservation details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print list" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Full day" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Print list" })).toBeEnabled());
    expect(printable()).toHaveTextContent("Ana");
  });

  it("uses Spanish labels without changing the printed time preference", async () => {
    useUiStore.setState({ locale: "es", timeFormat: "12h" });
    mockApi({
      "GET /v1/venues/v1/agenda": { body: { reservations: [reservation()] } },
      "GET /v1/venues/v1/tables": { body: { tables: [] } },
    });
    renderWithApp(<PrintReservationsDialog venueId="v1" date="2026-11-20" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir lista" })).toBeEnabled());
    expect(screen.getByRole("dialog", { name: "Imprimir reservas" })).toBeInTheDocument();
    expect(printable()).toHaveTextContent("7:00 PM");
    expect(printable()).toHaveTextContent("Lista de reservas");
  });
});
