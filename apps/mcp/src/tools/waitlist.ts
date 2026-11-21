import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";
import { fail } from "../fail.js";
import { ok, idempotencyKeySchema, guestObject, mergeGuest, RETRY, idempotencyKey } from "./common.js";

/** waitlist MCP operations; registered in their original order. */
export function registerWaitlistTools(server: McpServer) {
  server.registerTool(
    "waitlist.list",
    {
      title: "List waitlist",
      description:
        "List the guests waiting for a table, oldest first. Without date: today's queue, the entries with no date or today's date. With date (YYYY-MM-DD): the waiting entries guests made through the public waitlist for that date, plus today's queue when it is today. Each entry carries date (null for the same-day queue), windowStart, windowEnd and source (staff or widget). waitlist.seat works only for an entry of today or with no date; for a future date, book with reservation.create and then remove the entry with waitlist.cancel.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
          .optional()
          .describe("A local date, YYYY-MM-DD. Omit it for today's queue."),
      }),
    },
    async ({ venueId, date }) => {
      try {
        return ok(await request(`/v1/venues/${venueId}/waitlist`, date === undefined ? {} : { query: { date } }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "waitlist.add",
    {
      title: "Add to waitlist",
      description: "Add a guest to the waitlist when no table is available. Guest fields are guestName and guestContact, or the same as a guest object with name and contact." + RETRY,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        partySize: z.number().int().positive(),
        zone: z.string().optional(),
        guestName: z.string().optional(),
        guestContact: z.string().optional(),
        guest: guestObject("name+contact"),
        idempotencyKey: idempotencyKeySchema,
      }).strict(),
    },
    async ({ venueId, partySize, zone, guestName, guestContact, guest, idempotencyKey: key }) => {
      try {
        const g = mergeGuest({ name: guestName, contact: guestContact }, guest);
        return ok(
          await request(`/v1/venues/${venueId}/waitlist`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
            body: { partySize, zone, guest: { name: g.name, contact: g.contact } },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "waitlist.seat",
    {
      title: "Seat a waitlist entry",
      description:
        "Seat a waiting guest now as a walk-in, turning the entry into a reservation. Only an entry whose date is null or today can be seated; another date fails with invalid_transition." +
        RETRY,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        id: z.string(),
        idempotencyKey: idempotencyKeySchema,
      }),
    },
    async ({ venueId, id, idempotencyKey: key }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/waitlist/${id}/seat`, {
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
    "waitlist.cancel",
    {
      title: "Cancel a waitlist entry",
      description: "Remove a guest from the waitlist." + RETRY,
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
          await request(`/v1/venues/${venueId}/waitlist/${id}/cancel`, {
            method: "POST",
            idempotencyKey: idempotencyKey(key),
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

}
