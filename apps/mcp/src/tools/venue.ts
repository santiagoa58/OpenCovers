import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { request } from "../client.js";
import { fail } from "../fail.js";
import { ok } from "./common.js";

/** venue MCP operations; registered in their original order. */
export function registerVenueTools(server: McpServer) {
  server.registerTool(
    "venue.getConfig",
    {
      title: "Get venue config",
      description: "Read whether a venue accepts reservations and its notice address.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: z.object({ venueId: z.string() }),
    },
    async ({ venueId }) => {
      try {
        return ok(await request(`/v1/venues/${venueId}/config`));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "venue.setConfig",
    {
      title: "Set venue config",
      description:
        "Enable or disable reservations and set the notice address. Enabling requires a notice address. Takes no idempotency key. A retry with the same values sets the same configuration.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      inputSchema: z.object({
        venueId: z.string(),
        enabled: z.boolean().optional(),
        noticeAddress: z.string().optional(),
        notificationsEnabled: z.boolean().optional(),
        resendApiKey: z.string().optional(),
        fromEmail: z.string().optional(),
        slotIntervalMinutes: z.number().int().nonnegative().optional(),
        leadTimeMinutes: z.number().int().nonnegative().optional(),
        lastSeatingOffsetMinutes: z.number().int().nonnegative().optional(),
        phoneCountry: z
          .string()
          .nullable()
          .optional()
          .describe("ISO 3166 alpha-2 country for phone numbers without a country code. Null follows the venue time zone."),
        overbookingCeiling: z
          .number()
          .int()
          .min(0)
          .max(1000)
          .optional()
          .describe(
            "The most covers the venue accepts without tables at one time. 0 means every booking holds tables.",
          ),
        maxAdvanceDays: z
          .number()
          .int()
          .min(0)
          .max(1000)
          .nullable()
          .optional()
          .describe("Refuse bookings more than this many days ahead, counted from today in the venue time zone. Null turns it off."),
        maxActivePerGuestPerDay: z
          .number()
          .int()
          .min(1)
          .max(100)
          .nullable()
          .optional()
          .describe("The most active bookings one guest, identified by contact, may hold on one date. Null turns it off."),
        blockedDates: z
          .array(
            z.union([
              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict(),
            ]),
          )
          .max(366)
          .optional()
          .describe("Dates (YYYY-MM-DD) or { from, to } ranges, inclusive, in the venue time zone, on which no bookings are taken. Replaces the list. An empty list clears it."),
      }),
    },
    async ({ venueId, enabled, noticeAddress, notificationsEnabled, resendApiKey, fromEmail, slotIntervalMinutes, leadTimeMinutes, lastSeatingOffsetMinutes, phoneCountry, overbookingCeiling, maxAdvanceDays, maxActivePerGuestPerDay, blockedDates }) => {
      try {
        return ok(
          await request(`/v1/venues/${venueId}/config`, {
            method: "PUT",
            body: {
              enabled,
              noticeAddress,
              notificationsEnabled,
              resendApiKey,
              fromEmail,
              slotIntervalMinutes,
              leadTimeMinutes,
              lastSeatingOffsetMinutes,
              phoneCountry,
              overbookingCeiling,
              maxAdvanceDays,
              maxActivePerGuestPerDay,
              blockedDates,
            },
          }),
        );
      } catch (err) {
        return fail(err);
      }
    },
  );

}
