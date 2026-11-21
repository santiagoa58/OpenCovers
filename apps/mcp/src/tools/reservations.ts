import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";
import { fail } from "../fail.js";
import { ok, consentSchema, ratingSchema, reconfirmationSchema, commentarySchema, idempotencyKeySchema, guestObject, mergeGuest, GUEST_NOTE, RETRY, idempotencyKey } from "./common.js";

/** reservations MCP operations; registered in their original order. */
export function registerReservationTools(server: McpServer) {
  server.registerTool(
    "reservation.availability",
    {
      title: "Availability",
      description:
        "List available time slots for a venue on a date for a party size, grouped by service (meal period).",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string().describe("The venue id."),
        date: z.string().describe("Date as YYYY-MM-DD."),
        partySize: z.number().int().positive().describe("Number of guests."),
      }),
    },
    async ({ venueId, date, partySize }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/availability`, {
            query: { date, partySize },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.agenda",
    {
      title: "Agenda",
      description: "List reservations for a venue on a specific date.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        date: z.string().describe("Date as YYYY-MM-DD."),
      }),
    },
    async ({ venueId, date }) => {
      try {
        return ok(await request(`/v1/venues/${venueId}/agenda`, { query: { date } }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.list",
    {
      title: "List reservations",
      description: "List all reservations for a venue.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({ venueId: z.string() }),
    },
    async ({ venueId }) => {
      try {
        return ok(await request(`/v1/venues/${venueId}/reservations`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.search",
    {
      title: "Search reservations",
      description: "Search reservations for a venue within a date range, optionally filtered by status.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        dateStart: z.string().describe("Inclusive start date as YYYY-MM-DD."),
        dateEnd: z.string().describe("Exclusive end date as YYYY-MM-DD."),
        status: z
          .array(z.enum(["booked", "seated", "attended", "no_show", "cancelled"]))
          .optional(),
      }),
    },
    async ({ venueId, dateStart, dateEnd, status }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/reservations/search`, {
            query: { dateStart, dateEnd, status },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.get",
    {
      title: "Get reservation",
      description: "Get a single reservation by id.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({ venueId: z.string(), id: z.string() }),
    },
    async ({ venueId, id }) => {
      try {
        return ok(await request(`/v1/venues/${venueId}/reservations/${id}`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.create",
    {
      title: "Create reservation",
      description:
        "Create a reservation and return it. Pass table ids to assign them explicitly, or omit tables to let the engine assign tables automatically for the party size." + GUEST_NOTE + RETRY,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        date: z.string().describe("Date as YYYY-MM-DD."),
        time: z.string().describe("Time as HH:MM in the venue timezone."),
        partySize: z.number().int().positive(),
        tables: z
          .array(z.string())
          .optional()
          .describe("Table ids to assign. Omit to auto-assign."),
        zone: z
          .string()
          .optional()
          .describe("Zone to prefer (e.g. Terrace). When set, tables come from this zone."),
        guestName: z.string().optional(),
        guestContact: z.string().optional(),
        guest: guestObject("name+contact+consent"),
        consent: consentSchema,
        rating: ratingSchema,
        commentary: commentarySchema,
        reconfirmation: reconfirmationSchema,
        idempotencyKey: idempotencyKeySchema,
      }).strict(),
    },
    async ({ venueId, date, time, partySize, tables, zone, guestName, guestContact, guest, consent, rating, commentary, reconfirmation, idempotencyKey: key }) => {
      try {
        const g = mergeGuest({ name: guestName, contact: guestContact, consent }, guest);
        return ok(
          await request(`/v1/venues/${venueId}/reservations`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
            body: {
              date,
              time,
              partySize,
              tables,
              zone,
              guest: { name: g.name, contact: g.contact, consent: g.consent },
              rating,
              commentary,
              reconfirmation,
            },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.walk_in",
    {
      title: "Walk-in",
      description:
        "Seat a guest who arrives without a reservation. Defaults the time to now in the venue timezone." + GUEST_NOTE + RETRY,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        partySize: z.number().int().positive(),
        date: z.string().optional().describe("Date as YYYY-MM-DD. Defaults to today."),
        time: z.string().optional().describe("Time as HH:MM. Defaults to now."),
        tables: z.array(z.string()).optional().describe("Table ids. Omit to auto-assign."),
        zone: z.string().optional(),
        guestName: z.string().optional(),
        guestContact: z.string().optional(),
        guest: guestObject("name+contact+consent"),
        consent: consentSchema,
        rating: ratingSchema,
        commentary: commentarySchema,
        idempotencyKey: idempotencyKeySchema,
      }).strict(),
    },
    async ({ venueId, partySize, date, time, tables, zone, guestName, guestContact, guest, consent, rating, commentary, idempotencyKey: key }) => {
      try {
        const g = mergeGuest({ name: guestName, contact: guestContact, consent }, guest);
        return ok(
          await request(`/v1/venues/${venueId}/reservations/walk-in`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
            body: {
              date,
              time,
              partySize,
              tables,
              zone,
              guest: { name: g.name, contact: g.contact, consent: g.consent },
              rating,
              commentary,
            },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.modify",
    {
      title: "Modify reservation",
      description: "Modify a reservation's party size, tables, contact consent, rating, booking note, and/or reconfirmation. Consent is consent, or guest.consent." + RETRY,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        id: z.string(),
        partySize: z.number().int().positive().optional(),
        tables: z.array(z.string()).min(1).optional(),
        guest: guestObject("consent"),
        consent: consentSchema,
        rating: ratingSchema,
        commentary: commentarySchema,
        reconfirmation: reconfirmationSchema,
        idempotencyKey: idempotencyKeySchema,
      }).strict(),
    },
    async ({ venueId, id, partySize, tables, guest, consent: flatConsent, rating, commentary, reconfirmation, idempotencyKey: key }) => {
      try {
        const { consent } = mergeGuest({ consent: flatConsent }, guest);
        return ok(
          await request(`/v1/venues/${venueId}/reservations/${id}/modify`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
            body: { partySize, tables, guest: consent ? { consent } : undefined, rating, commentary, reconfirmation },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.cancel",
    {
      title: "Cancel reservation",
      description: "Cancel a reservation." + RETRY,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        id: z.string(),
        idempotencyKey: idempotencyKeySchema,
      }),
    },
    async ({ venueId, id, idempotencyKey: key }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/reservations/${id}/cancel`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.status",
    {
      title: "Set reservation status",
      description:
        "Advance a reservation status: seat, mark attended, or mark no-show. Seating needs a table: a booking without tables fails with table_required, so assign one with reservation.modify first." + RETRY,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        id: z.string(),
        status: z.enum(["seated", "attended", "no_show"]),
        idempotencyKey: idempotencyKeySchema,
      }),
    },
    async ({ venueId, id, status, idempotencyKey: key }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/reservations/${id}/status`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
            body: { status },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.events",
    {
      title: "Reservation events",
      description: "Read the reservation event feed for a venue, from a cursor.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().positive().optional(),
      }),
    },
    async ({ venueId, cursor, limit }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/events`, { query: { cursor, limit } }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "reservation.erasure",
    {
      title: "Erase personal data",
      description:
        "Needs an admin key, a write key gets forbidden. Erase guest data for a venue, by guest id or owner principal. A guest id erases the guest record, every reservation linked to it, and the venue's waitlist entries with the same contact. An owner principal erases the reservations it owns and the guest records left with no other visit. A guest id that is not a record is read as a contact, which is deprecated. Returns counts of erased reservations, guest records, and waitlist entries. Takes no idempotency key. A retry erases nothing more and reports 0 for what the first call erased.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        guestId: z
          .string()
          .optional()
          .describe("Guest record id from a reservation's guest.guestId. A contact still works for one version and is deprecated."),
        principal: z.string().optional().describe("Owner principal to erase."),
      }),
    },
    async ({ venueId, guestId, principal }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/erasure`, {
            method: "POST",
            body: { guestId, principal },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

}
