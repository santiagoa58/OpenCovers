#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerReservationTools } from "./tools/reservations.js";
import { registerVenueTools } from "./tools/venue.js";
import { registerWaitlistTools } from "./tools/waitlist.js";

const VERSION = "0.2.0";

/** Compose independent MCP tool groups without mixing transport and domain logic. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "opencovers", version: VERSION });
  registerReservationTools(server);
  registerVenueTools(server);
  registerWaitlistTools(server);
  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
