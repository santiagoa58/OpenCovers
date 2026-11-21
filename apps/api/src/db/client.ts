import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/opencovers",
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 10_000),
});

export const db = drizzle(pool, { schema });
