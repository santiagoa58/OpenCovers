import type { Hono, MiddlewareHandler } from "hono";
import { db } from "../db/client";
import { sendError } from "./send-error";
import { floorItemSchema, floorItemLayoutSchema, tableSchema, tableLayoutSchema, serviceSchema } from "./room-schemas";
import { addFloorItem, deleteFloorItem, listFloorItems, updateFloorItemLayout } from "../lib/floor-items";
import { deleteService, deleteTable, listServices, listTables, parseDays, updateTableLayout, upsertService, upsertTable } from "../lib/catalog";
import type { AppEnv } from "./types";

/** Register room/table/service routes in their original order under staff venue auth. */
export function registerRoomRoutes(app: Hono<AppEnv>, adminOnly: MiddlewareHandler<AppEnv>) {
app.get("/v1/venues/:venueId/floor-items", async (c) => {
  const venueId = c.req.param("venueId");
  const items = await listFloorItems(db, venueId);
  return c.json({ items });
});

app.post("/v1/venues/:venueId/floor-items", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const parsed = floorItemSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return sendError(c, "invalid_request");
  const item = await addFloorItem(db, venueId, parsed.data);
  const items = await listFloorItems(db, venueId);
  return c.json({ items, item }, 201);
});

app.delete("/v1/venues/:venueId/floor-items/:itemId", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const itemId = c.req.param("itemId");
  await deleteFloorItem(db, venueId, itemId);
  const items = await listFloorItems(db, venueId);
  return c.json({ items });
});

app.patch("/v1/venues/:venueId/floor-items/:itemId", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const itemId = c.req.param("itemId");
  const parsed = floorItemLayoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return sendError(c, "invalid_request");
  await updateFloorItemLayout(db, venueId, itemId, parsed.data);
  const items = await listFloorItems(db, venueId);
  return c.json({ items });
});

app.get("/v1/venues/:venueId/tables", async (c) => {
  const venueId = c.req.param("venueId");
  const tables = await listTables(db, venueId);
  return c.json({ tables });
});

app.post("/v1/venues/:venueId/tables", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const parsed = tableSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return sendError(c, "invalid_request");
  await upsertTable(db, venueId, parsed.data);
  const tables = await listTables(db, venueId);
  return c.json({ tables });
});

app.delete("/v1/venues/:venueId/tables/:tableId", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const tableId = c.req.param("tableId");
  await deleteTable(db, venueId, tableId);
  const tables = await listTables(db, venueId);
  return c.json({ tables });
});

app.patch("/v1/venues/:venueId/tables/:tableId", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const tableId = c.req.param("tableId");
  const parsed = tableLayoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return sendError(c, "invalid_request");
  await updateTableLayout(db, venueId, tableId, parsed.data);
  const tables = await listTables(db, venueId);
  return c.json({ tables });
});

app.get("/v1/venues/:venueId/services", async (c) => {
  const venueId = c.req.param("venueId");
  const services = await listServices(db, venueId);
  return c.json({ services });
});

app.post("/v1/venues/:venueId/services", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const parsed = serviceSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return sendError(c, "invalid_request");
  // The catalog keeps the existing uniqueness check and weekday ordering.
  const days = parsed.data.days === undefined ? undefined : parseDays(parsed.data.days);
  if (days === null) return sendError(c, "invalid_request");
  const upserted = await upsertService(db, venueId, { ...parsed.data, days });
  if (!upserted.ok) return sendError(c, upserted.code);
  const services = await listServices(db, venueId);
  return c.json({ services });
});

app.delete("/v1/venues/:venueId/services/:name", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const name = c.req.param("name");
  await deleteService(db, venueId, name);
  const services = await listServices(db, venueId);
  return c.json({ services });
});


}
