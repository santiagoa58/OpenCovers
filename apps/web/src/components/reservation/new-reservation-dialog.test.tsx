import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockApi, renderWithApp, resetApiMocks } from "@/test/mock-api";
import { NewReservationDialog } from "./new-reservation-dialog";

const TABLES = [
  { id: "t1", name: "Table 1", seats: 2, zone: "main", shape: "round", posX: 0, posY: 0, rotation: 0 },
  { id: "t2", name: "Table 2", seats: 4, zone: "main", shape: "round", posX: 0, posY: 0, rotation: 0 },
];
const CREATE = "POST /v1/venues/v1/reservations";
const CREATE_PATH = "/v1/venues/v1/reservations";

function setup(
  extra: Parameters<typeof mockApi>[0] = {},
  tables: typeof TABLES = TABLES,
  partySize = 2,
  initialTableId?: string,
) {
  const api = mockApi({
    "GET /v1/venues/v1/tables": { body: { tables } },
    "GET /v1/venues/v1/tables/availability": { body: { tables: tables.map((t) => ({ id: t.id, available: true })) } },
    [CREATE]: { body: { id: "r1" } },
    ...extra,
  });
  const onOpenChange = vi.fn();
  renderWithApp(
    <NewReservationDialog
      venueId="v1"
      date="2026-11-20"
      time="20:30"
      partySize={partySize}
      open
      initialTableId={initialTableId}
      onOpenChange={onOpenChange}
    />,
  );
  return { api, onOpenChange, user: userEvent.setup() };
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Create reservation" }));
}

describe("NewReservationDialog", () => {
  afterEach(() => {
    resetApiMocks();
  });

  it("sends the party size as a number with date, time, guest, note and tables", async () => {
    const { api, onOpenChange, user } = setup();
    await user.click(await screen.findByRole("button", { name: /Table 2 · 4/ }));
    await user.clear(screen.getByLabelText("Party size"));
    await user.type(screen.getByLabelText("Party size"), "3");
    await user.type(screen.getByLabelText("Guest name"), "Jane Doe");
    await user.type(screen.getByLabelText("Contact"), "jane@example.com");
    await user.type(screen.getByLabelText("Staff note"), "Anniversary");
    await submit(user);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const [req] = api.calls("POST", CREATE_PATH);
    expect(req.body).toEqual({
      date: "2026-11-20",
      time: "20:30",
      partySize: 3,
      tables: ["t2"],
      guest: { name: "Jane Doe", contact: "jane@example.com" },
      commentary: "Anniversary",
    });
    expect(typeof (req.body as { partySize: unknown }).partySize).toBe("number");
    expect(req.headers["Idempotency-Key"]).toBeTruthy();
    expect(await screen.findByText("Reservation created")).toBeInTheDocument();
  });

  it("sends the prefilled party size as a number when the host does not touch it", async () => {
    const { api, user } = setup({}, TABLES, 2);
    await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
    await submit(user);

    await waitFor(() => expect(api.writes()).toHaveLength(1));
    const body = api.writes()[0].body as { partySize: unknown; commentary?: string };
    expect(body.partySize).toBe(2);
    expect(body.commentary).toBeUndefined();
  });

  it("sums the seats of several selected tables", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
    await user.click(screen.getByRole("button", { name: /Table 2 · 4/ }));
    expect(screen.getByText("6 seats selected for 2 guests.")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Party size"));
    await user.type(screen.getByLabelText("Party size"), "6");
    await submit(user);

    await waitFor(() => expect(api.writes()).toHaveLength(1));
    expect(api.writes()[0].body).toMatchObject({ partySize: 6, tables: ["t1", "t2"] });
  });

  it("limits the note to 500 characters and warns about health data", async () => {
    const { user } = setup();
    expect(await screen.findByLabelText("Staff note")).toHaveAttribute("maxlength", "500");
    expect(
      screen.getByText("Optional instructions for staff, up to 500 characters. Do not include sensitive personal or health information."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Staff note"), "x".repeat(520));
    expect((screen.getByLabelText("Staff note") as HTMLTextAreaElement).value).toHaveLength(500);
  });

  it("shows reserved tables and disables them for the whole seating interval", async () => {
    const { user } = setup({
      "GET /v1/venues/v1/tables/availability": { body: { tables: [
        { id: "t1", available: false, reservedBy: "Booked Guest", reservedUntil: "21:00" },
        { id: "t2", available: true },
      ] } },
    });
    const reserved = await screen.findByRole("button", { name: /Table 1 · 2 · Booked/ });
    expect(reserved).toBeDisabled();
    expect(reserved).toHaveAttribute("title", "Booked until 21:00");
    expect(screen.getByRole("button", { name: /Table 2 · 4 · Free/ })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Table 2 · 4/ }));
    expect(screen.getByText("4 seats selected for 2 guests.")).toBeInTheDocument();
  });

  it("does not require a guest name or contact", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
    await submit(user);

    await waitFor(() => expect(api.writes()).toHaveLength(1));
    expect((api.writes()[0].body as { guest: unknown }).guest).toEqual({});
  });

  it("refuses a party larger than the selected tables and sends nothing", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
    await user.clear(screen.getByLabelText("Party size"));
    await user.type(screen.getByLabelText("Party size"), "5");
    await submit(user);

    expect(
      await screen.findByText("The party is larger than the selected tables."),
    ).toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it("asks for a table when none is selected and sends nothing", async () => {
    const { api, user } = setup();
    await screen.findByRole("button", { name: /Table 1 · 2/ });
    await submit(user);

    expect(await screen.findByText("Select at least one table.")).toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it("rejects an empty party size before calling the server", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
    await user.clear(screen.getByLabelText("Party size"));
    await submit(user);

    expect(await screen.findByText("Party size is required.")).toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it("rejects a party of zero before calling the server", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
    await user.clear(screen.getByLabelText("Party size"));
    await user.type(screen.getByLabelText("Party size"), "0");
    await submit(user);

    expect(screen.getByLabelText("Party size")).toBeInvalid();
    expect(api.writes()).toHaveLength(0);
  });

  it("tells the host when the venue has no tables yet", async () => {
    const { api, user } = setup({}, []);
    expect(await screen.findByText("This venue has no tables yet.")).toBeInTheDocument();
    await submit(user);

    expect(await screen.findByText("Select at least one table.")).toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  });

  it.each([
    ["slot_taken", "Time conflict: a selected table is already reserved during this 120-minute seating window. Choose another table or arrival time."],
    ["outside_hours", "That time is outside the venue's opening hours."],
  ])(
    "shows the %s error and keeps the dialog open",
    async (code, text) => {
      const { onOpenChange, user } = setup({ [CREATE]: { status: 409, body: { code } } });
      await user.click(await screen.findByRole("button", { name: /Table 1 · 2/ }));
      await submit(user);

      expect(await screen.findByText(text)).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByRole("button", { name: "Create reservation" })).toBeEnabled();
    },
  );
  it("preselects a table chosen directly from the floor and preserves the arrival time", async () => {
    const { api, user } = setup({}, TABLES, 2, "t2");
    expect(await screen.findByText("4 seats selected for 2 guests.")).toBeInTheDocument();
    expect(screen.getByText("2026-11-20 at 20:30")).toBeInTheDocument();
    await submit(user);
    await waitFor(() => expect(api.writes()).toHaveLength(1));
    expect(api.writes()[0].body).toMatchObject({ time: "20:30", tables: ["t2"] });
  });

  it("shows a clear conflict if a preselected floor table is unavailable during the seating window", async () => {
    const { api } = setup({
      "GET /v1/venues/v1/config": { body: { turnTimes: [{ upTo: 1000, minutes: 90 }] } },
      "GET /v1/venues/v1/tables/availability": { body: { tables: [
        { id: "t1", available: false, reservedUntil: "21:30" },
        { id: "t2", available: true },
      ] } },
    }, TABLES, 2, "t1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Time conflict");
    expect(screen.getByText("Booked until 21:30")).toBeInTheDocument();
    expect(screen.getByTestId("reservation-conflict-summary")).toHaveTextContent("90 minutes");
    expect(api.writes()).toHaveLength(0);
  });

});
