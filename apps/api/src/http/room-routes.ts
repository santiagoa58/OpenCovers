import { type Context, type Hono, type MiddlewareHandler } from "hono";
import { db } from "../db/client";
import { ERRORS, errorBody, type ErrorCode } from "../lib/errors";
import { addFloorItem, deleteFloorItem, listFloorItems, updateFloorItemLayout } from "../lib/floor-items";
import { deleteService, deleteTable, listServices, parseDays, listTables, updateTableLayout, upsertService, upsertTable } from "../lib/catalog";
import type { AppEnv } from "../app";

function sendError(c: Context<AppEnv>, code: ErrorCode) {
  return c.json(errorBody(code), ERRORS[code].status);
}

function isPartyLimit(value: unknown): boolean {
  return value === undefined || value === null || (Number.isInteger(value) && (value as number) >= 1);
}

/** Register room/table/service routes in their original order under staff venue auth. */
export function registerRoomRoutes(app: Hono<AppEnv>, adminOnly: MiddlewareHandler<AppEnv>) {
app.get("/v1/venues/:venueId/floor-items", async (c) => {
  const venueId = c.req.param("venueId");
  const items = await listFloorItems(db, venueId);
  return c.json({ items });
});

app.post("/v1/venues/:venueId/floor-items", adminOnly, async (c) => {
  const venueId = c.req.param("venueId");
  const body = await c.req.json();
  if (typeof body.type !== "string" || body.type === "") {
    return sendError(c, "invalid_request");
  }
  const item = await addFloorItem(db, venueId, {
    type: body.type,
    label: typeof body.label === "string" ? body.label : undefined,
    posX: typeof body.posX === "number" ? body.posX : undefined,
    posY: typeof body.posY === "number" ? body.posY : undefined,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
  });
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
  const body = await c.req.json();
  await updateFloorItemLayout(db, venueId, itemId, {
    x: typeof body.x === "number" ? body.x : undefined,
    y: typeof body.y === "number" ? body.y : undefined,
    rotation: typeof body.rotation === "number" ? body.rotation : undefined,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
  });
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
  const body = await c.req.json();
  if (
    typeof body.id !== "string" ||
    body.id === "" ||
    typeof body.name !== "string" ||
    typeof body.seats !== "number" ||
    !Number.isInteger(body.seats) ||
    body.seats < 1
  ) {
    return sendError(c, "invalid_request");
  }
  await upsertTable(db, venueId, {
    id: body.id,
    name: body.name,
    seats: body.seats,
    zone: typeof body.zone === "string" ? body.zone : undefined,
    shape: typeof body.shape === "string" ? body.shape : undefined,
  });
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
  const body = await c.req.json();
  await updateTableLayout(db, venueId, tableId, {
    x: typeof body.x === "number" ? body.x : undefined,
    y: typeof body.y === "number" ? body.y : undefined,
    rotation: typeof body.rotation === "number" ? body.rotation : undefined,
  });
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
  const body = await c.req.json();
  if (
    typeof body.name !== "string" ||
    body.name === "" ||
    typeof body.openStart !== "string" ||
    typeof body.openEnd !== "string" ||
    !isPartyLimit(body.minPartySize) ||
    !isPartyLimit(body.maxPartySize) ||
    (body.days !== undefined && parseDays(body.days) === null)
  ) {
    return sendError(c, "invalid_request");
  }
  const upserted = await upsertService(db, venueId, {
    name: body.name,
    openStart: body.openStart,
    openEnd: body.openEnd,
    minPartySize: body.minPartySize,
    maxPartySize: body.maxPartySize,
    days: body.days === undefined ? undefined : (parseDays(body.days) as number[]),
  });
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
