import { z } from "zod";
import { COMMENTARY_MAX_LENGTH } from "../lib/commentary";
import { CONSENTS } from "../lib/consent";
import { RECONFIRMATIONS } from "../lib/reconfirmation";

const guest = z.strictObject({
  name: z.string().optional(),
  contact: z.string().optional(),
  consent: z.enum(CONSENTS).optional(),
});

const rating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
  .nullable()
  .optional();

const commentary = z.string().trim().max(COMMENTARY_MAX_LENGTH).optional();
const tables = z.array(z.string()).optional();
const partySize = z.number().int().min(1);

const reservationFields = {
  partySize,
  tables,
  zone: z.string().optional(),
  guest: guest.optional(),
  rating,
  commentary,
};

export const staffReservationSchema = z.strictObject({
  ...reservationFields,
  date: z.string(),
  time: z.string(),
  reconfirmation: z.enum(RECONFIRMATIONS).optional(),
});

export const staffWalkInSchema = z.strictObject({
  ...reservationFields,
  date: z.string().optional(),
  time: z.string().optional(),
});

export const staffWaitlistSchema = z.strictObject({
  partySize,
  zone: z.string().optional(),
  guest: z.strictObject({
    name: z.string().optional(),
    contact: z.string().optional(),
  }).optional(),
});

export const staffModifySchema = z.strictObject({
  date: z.string().optional(),
  time: z.string().optional(),
  partySize: partySize.optional(),
  tables,
  guest: z.strictObject({
    name: z.string().optional(),
    consent: z.enum(CONSENTS).optional(),
  }).optional(),
  rating,
  commentary,
  reconfirmation: z.enum(RECONFIRMATIONS).optional(),
});

export const staffStatusSchema = z.strictObject({
  status: z.enum(["booked", "seated", "attended", "no_show"]),
});
