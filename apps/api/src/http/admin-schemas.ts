import { z } from "zod";
import { BLOCKLIST_REASONS } from "../lib/blocklist";
import { MAX_EXPIRY_HOURS } from "../lib/invitations";

const role = z.enum(["read", "write", "admin"]);

export const createVenueSchema = z.strictObject({
  name: z.string().trim().min(1),
  timezone: z.string().optional(),
});

export const transferCreatorSchema = z.strictObject({
  userId: z.string().min(1),
});

export const invitationSchema = z.strictObject({
  role,
  email: z.string().optional(),
  expiresInHours: z.number().int().min(1).max(MAX_EXPIRY_HOURS).optional(),
});

export const roleChangeSchema = z.strictObject({ role });
export const invitationTokenSchema = z.strictObject({ token: z.string().min(1) });

export const instanceKeySchema = z.strictObject({
  key: z.string().min(1),
  principal: z.string().min(1),
  role,
  venues: z.array(z.string()).optional(),
});

export const instanceKeyRevokeSchema = z.strictObject({ key: z.string().min(1) });

export const venueKeySchema = z.strictObject({
  key: z.string().min(1),
  principal: z.string().min(1),
  role: z.enum(["read", "write"]),
});

export const venueKeyRevokeSchema = z.strictObject({ hash: z.string().min(1) });

export const mergeGuestSchema = z.strictObject({ intoGuestId: z.string().min(1) });

export const erasureSchema = z.strictObject({
  guestId: z.string().min(1).optional(),
  principal: z.string().min(1).optional(),
});

export const blocklistSubjectSchema = z.strictObject({
  guestId: z.string().optional(),
  contact: z.string().optional(),
});

export const blocklistAddSchema = z.strictObject({
  guestId: z.string().optional(),
  contact: z.string().optional(),
  reason: z.enum(BLOCKLIST_REASONS).nullable().optional(),
});

