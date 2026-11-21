import type { Context } from "hono";
import { ERRORS, errorBody, type ErrorCode } from "../lib/errors";
import type { AppEnv } from "../app";

/** Shared HTTP error representation for extracted route modules. */
export function sendError(c: Context<AppEnv>, code: ErrorCode) {
  return c.json(errorBody(code), ERRORS[code].status);
}
