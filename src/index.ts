#!/usr/bin/env node

import { createRequire } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BolClient } from "./bol-client.js";
import { createServer, parseToolsets } from "./server.js";
import { checkForUpdate } from "./update-checker.js";

const require = createRequire(import.meta.url);
const { name, version } = require("../package.json") as { name: string; version: string };

const clientId = process.env.BOL_CLIENT_ID;
const clientSecret = process.env.BOL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing required env vars: BOL_CLIENT_ID and BOL_CLIENT_SECRET");
  process.exit(1);
}

const cacheTtl = process.env.BOL_CACHE_TTL !== undefined
  ? parseInt(process.env.BOL_CACHE_TTL, 10) * 1000
  : undefined;
const maxRetries = process.env.BOL_MAX_RETRIES !== undefined
  ? parseInt(process.env.BOL_MAX_RETRIES, 10)
  : 3;
const client = new BolClient(clientId, clientSecret, undefined, cacheTtl, { maxRetries });
const toolsets = parseToolsets(process.env.BOL_TOOLSETS);
const server = createServer(client, toolsets);

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Fire-and-forget — don't block server startup
  void checkForUpdate(name, version);
};

main().catch((error) => {
  console.error("Bol.com MCP server failed:", error);
  process.exit(1);
});
