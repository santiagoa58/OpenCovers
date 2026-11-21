import type { Origin } from "../lib/origin";

/** Typed request-scoped values installed by staff/venue authentication middleware. */
export type AppEnv = {
  Variables: {
    principal: string;
    role: string;
    origin: Origin;
  };
};
