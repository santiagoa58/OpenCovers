import type { Context, Hono, MiddlewareHandler } from "hono";
import { db } from "../db/client";
import { getConfig, setConfig } from "../lib/venue";
import { getProfile, parseProfileInput, setProfile } from "../lib/public-profile";
import { getOnlineBooking, parseOnlineBookingInput, rotateBookingKey, setOnlineBooking } from "../lib/online-booking";
import { createWebhook, deleteWebhook, listWebhooks, webhookPolicyFromEnv } from "../lib/webhooks";
import { toCountryCode } from "../lib/contact";
import { parseTurnTimes } from "../lib/turn-times";
import { venueConfigSchema, webhookCreateSchema } from "./venue-settings-schemas";
import { parseBlockedDates, type DateRange } from "../lib/booking-policy";
import type { AppEnv } from "./types";
import { sendError } from "./send-error";

/** Settings routes share the venue's auth and error semantics, with no UI dependencies. */
export function registerVenueSettingsRoutes(
  app: Hono<AppEnv>,
  adminOnly: MiddlewareHandler<AppEnv>,
  creatorId: (c: Context<AppEnv>) => Promise<string | null>,
) {
app.get("/v1/venues/:venueId/config", async (c) => {
  const venueId = c.req.param("venueId");
  const config = await getConfig(db, venueId);
  if (!config) return sendError(c, "venue_not_found");
  return c.json(config);
});

app.put("/v1/venues/:venueId/config", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const parsed = venueConfigSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return sendError(c, "invalid_request");
  const body = parsed.data;
  // Omitting a field preserves its current value. Explicit null is supported only for nullable settings.
  let phoneCountry: ReturnType<typeof toCountryCode> | undefined;
  if (body.phoneCountry === null) {
    phoneCountry = null;
  } else if (body.phoneCountry !== undefined) {
    phoneCountry = toCountryCode(body.phoneCountry);
    if (phoneCountry === null) return sendError(c, "invalid_request");
  }

  // Normalize only supplied fields. Empty arrays clear schedules; invalid arrays never reach the database.
  if (body.turnTimes !== undefined) {
    const normalized = parseTurnTimes(body.turnTimes);
    if (normalized === null) return sendError(c, "invalid_request");
    body.turnTimes = normalized;
  }
  let blockedDates: DateRange[] | undefined;
  if (body.blockedDates !== undefined) {
    const normalized = parseBlockedDates(body.blockedDates);
    if (normalized === null) return sendError(c, "invalid_request");
    blockedDates = normalized;
  }

  const result = await setConfig(db, venueId, { ...body, phoneCountry, blockedDates });
  if (!result.ok) return sendError(c, result.code);
  return c.json(result.config);
});

app.get("/v1/venues/:venueId/public-profile", async (c) => {
  const profile = await getProfile(db, c.req.param("venueId"));
  if (!profile) return sendError(c, "venue_not_found");
  return c.json(profile);
});

app.put("/v1/venues/:venueId/public-profile", adminOnly, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return sendError(c, "invalid_request");
  }
  const input = parseProfileInput(body);
  if (!input) return sendError(c, "invalid_request");
  const result = await setProfile(db, c.req.param("venueId"), input);
  if (!result.ok) return sendError(c, result.code);
  return c.json(result.profile);
});

app.get("/v1/venues/:venueId/online-booking", async (c) => {
  const settings = await getOnlineBooking(db, c.req.param("venueId"));
  if (!settings) return sendError(c, "venue_not_found");
  return c.json(settings);
});

app.put("/v1/venues/:venueId/online-booking", adminOnly, async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = parseOnlineBookingInput(body);
  if (!input) return sendError(c, "invalid_request");
  const result = await setOnlineBooking(db, c.req.param("venueId"), input);
  if (!result.ok) return sendError(c, result.code);
  return c.json({ ...result.settings, warnings: result.warnings });
});

app.post("/v1/venues/:venueId/online-booking/rotate-key", adminOnly, async (c) => {
  const result = await rotateBookingKey(db, c.req.param("venueId"));
  if (!result.ok) return sendError(c, result.code);
  return c.json(result.settings);
});

app.get("/v1/venues/:venueId/webhooks", async (c) => {
  if (c.get("role") === "read") return sendError(c, "forbidden");
  const webhooks = await listWebhooks(db, c.req.param("venueId"));
  return c.json({ webhooks });
});

app.post("/v1/venues/:venueId/webhooks", async (c) => {
  const venueId = c.req.param("venueId");
  const parsed = webhookCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return sendError(c, "invalid_request");
  const result = await createWebhook(
    db,
    venueId,
    parsed.data.url,
    webhookPolicyFromEnv(),
    await creatorId(c),
  );
  if (!result.ok) return sendError(c, result.code);
  return c.json(result.webhook, 201);
});

app.delete("/v1/venues/:venueId/webhooks/:webhookId", async (c) => {
  const venueId = c.req.param("venueId");
  const deleted = await deleteWebhook(db, venueId, c.req.param("webhookId"));
  if (!deleted) return sendError(c, "webhook_not_found");
  const webhooks = await listWebhooks(db, venueId);
  return c.json({ webhooks });
});


}
