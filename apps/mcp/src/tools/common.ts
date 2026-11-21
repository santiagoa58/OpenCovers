import { z } from "zod";
import type { ToolResult } from "../fail.js";

/** Shared request schemas, guest input normalization and idempotent write helpers. */
export function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export const consentSchema = z
  .enum(["unknown", "granted", "denied"])
  .optional()
  .describe("Whether the guest allows being contacted after the visit. Omit if never asked.");

export const ratingSchema = z
  .number()
  .int()
  .min(1)
  .max(5)
  .nullable()
  .optional()
  .describe("The guest's rating of the visit, 1 to 5. Omit if not given. Null clears it.");

export const reconfirmationSchema = z
  .enum(["none", "requested", "confirmed", "declined", "no_answer"])
  .optional()
  .describe(
    "Whether the guest reconfirmed the booking. none means not asked, requested means asked and waiting. Omit to leave it unchanged. A booking is never cancelled by it.",
  );

export const commentarySchema = z
  .string()
  .max(500)
  .optional()
  .describe(
    "A short note for staff about this booking, up to 500 characters, such as an occasion. Never put allergies, medical conditions, or diet needs here. Empty string clears it.",
  );

export export const idempotencyKeySchema = z
  .string()
  .optional()
  .describe("Any unique string for this write. Send the same one again to retry it. Omit it and the server makes a new one.");

export const guestObject = (fields: "name+contact+consent" | "name+contact" | "consent") => {
  const shape: Record<string, z.ZodType> = {};
  if (fields !== "consent") {
    shape.name = z.string().optional();
    shape.contact = z.string().optional();
  }
  if (fields !== "name+contact") shape.consent = consentSchema;
  return z
    .object(shape)
    .strict()
    .optional()
    .describe("Same as the flat guestName, guestContact and consent fields, in the shape the HTTP API uses. Pass one or the other.");
};

type Guest = { name?: string; contact?: string; consent?: "unknown" | "granted" | "denied" };

export function mergeGuest(flat: Guest, nested: Guest | undefined): Guest {
  const names = { name: "guestName", contact: "guestContact", consent: "consent" } as const;
  const out: Guest = { ...flat };
  for (const key of Object.keys(names) as (keyof Guest)[]) {
    const n = nested?.[key];
    if (n === undefined) continue;
    if (flat[key] !== undefined && flat[key] !== n) {
      throw new Error(`guest.${key} and ${names[key]} disagree. Pass only one of them.`);
    }
    (out as Record<string, unknown>)[key] = n;
  }
  return out;
}

export const GUEST_NOTE = " Guest fields are guestName, guestContact and consent, or the same as a guest object with name, contact and consent.";

export const RETRY =
  " Pass the same idempotencyKey when you retry after a timeout or an error. Without it a retry is a new write and may create a duplicate.";

const idempotencyKey = (key?: string) => key ?? crypto.randomUUID();

