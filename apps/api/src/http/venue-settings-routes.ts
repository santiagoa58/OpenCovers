import type { Context, Hono, MiddlewareHandler } from "hono";
import { db } from "../db/client";
import { getConfig, setConfig } from "../lib/venue";
import { getProfile, parseProfileInput, setProfile } from "../lib/public-profile";
import { getOnlineBooking, parseOnlineBookingInput, rotateBookingKey, setOnlineBooking } from "../lib/online-booking";
import { createWebhook, deleteWebhook, listWebhooks, webhookPolicyFromEnv } from "../lib/webhooks";
import { toCountryCode } from "../lib/contact";
import { parseTurnTimes } from "../lib/turn-times";
import { isMaxActivePerGuest, isMaxAdvanceDays, parseBlockedDates } from "../lib/booking-policy";
import type { AppEnv } from "../app";
import { sendError } from "./send-error";

function isCeiling(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1000;
}
function isPosInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

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
  const body = await c.req.json();
  if (body.phoneCountry != null && !toCountryCode(body.phoneCountry)) {
    return sendError(c, "invalid_request");
  }
  const turnTimes = body.turnTimes === undefined ? undefined : parseTurnTimes(body.turnTimes);
  if (turnTimes === null) return sendError(c, "invalid_request");
  if (body.overbookingCeiling !== undefined && !isCeiling(body.overbookingCeiling)) {
    return sendError(c, "invalid_request");
  }
  const blockedDates = body.blockedDates === undefined ? undefined : parseBlockedDates(body.blockedDates);
  if (blockedDates === null) return sendError(c, "invalid_request");
  if (body.maxAdvanceDays != null && !isMaxAdvanceDays(body.maxAdvanceDays)) return sendError(c, "invalid_request");
  if (body.maxActivePerGuestPerDay != null && !isMaxActivePerGuest(body.maxActivePerGuestPerDay)) {
    return sendError(c, "invalid_request");
  }
  const result = await setConfig(db, venueId, {
    enabled: body.enabled,
    noticeAddress: body.noticeAddress,
    notificationsEnabled: typeof body.notificationsEnabled === "boolean" ? body.notificationsEnabled : undefined,
    resendApiKey: typeof body.resendApiKey === "string" ? body.resendApiKey : undefined,
    fromEmail: typeof body.fromEmail === "string" ? body.fromEmail : undefined,
    slotIntervalMinutes: isPosInt(body.slotIntervalMinutes) ? body.slotIntervalMinutes : undefined,
    leadTimeMinutes: isPosInt(body.leadTimeMinutes) ? body.leadTimeMinutes : undefined,
    lastSeatingOffsetMinutes: isPosInt(body.lastSeatingOffsetMinutes)
      ? body.lastSeatingOffsetMinutes
      : undefined,
    phoneCountry: body.phoneCountry === null ? null : toCountryCode(body.phoneCountry) ?? undefined,
    turnTimes,
    overbookingCeiling: body.overbookingCeiling,
    maxAdvanceDays: body.maxAdvanceDays,
    maxActivePerGuestPerDay: body.maxActivePerGuestPerDay,
    blockedDates,
  });
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
  const body = await c.req.json().catch(() => null);
  if (typeof body?.url !== "string") return sendError(c, "invalid_request");
  const result = await createWebhook(
    db,
    venueId,
    body.url,
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
