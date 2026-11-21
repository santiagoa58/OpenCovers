import { z } from "zod";

/** Transport schemas. Capacity and allocation rules remain in the domain services. */
const layoutCoordinate = z.number().finite();
const layoutFields = {
  x: layoutCoordinate.optional(),
  y: layoutCoordinate.optional(),
  rotation: layoutCoordinate.optional(),
};

export const floorItemSchema = z.object({
  type: z.string().min(1),
  label: z.string().optional(),
  posX: layoutCoordinate.optional(),
  posY: layoutCoordinate.optional(),
  width: layoutCoordinate.optional(),
  height: layoutCoordinate.optional(),
});

export const floorItemLayoutSchema = z.object({
  ...layoutFields,
  width: layoutCoordinate.optional(),
  height: layoutCoordinate.optional(),
});

export const tableSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  seats: z.number().int().min(1),
  zone: z.string().optional(),
  shape: z.string().optional(),
});

export const tableLayoutSchema = z.object(layoutFields);

const weekdaysSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length, "Weekdays must be unique")
  .transform((days) => [...days].sort((a, b) => a - b));

export const serviceSchema = z.object({
  name: z.string().min(1),
  openStart: z.string(),
  openEnd: z.string(),
  minPartySize: z.number().int().min(1).nullable().optional(),
  maxPartySize: z.number().int().min(1).nullable().optional(),
  days: weekdaysSchema.optional(),
});
