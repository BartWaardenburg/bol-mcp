import { describe, it, expect, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createServer, parseToolsets, type Toolset } from "./server.js";
import type { BolClient } from "./bol-client.js";

const mockClient = {} as BolClient;

const connect = async (
  toolsets?: Set<Toolset>,
): Promise<{ client: Client; close: () => Promise<void> }> => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createServer(mockClient, toolsets);
  await server.connect(serverSide);
  const client = new Client({ name: "protocol-test", version: "0.0.0" });
  await client.connect(clientSide);
  return { client, close: async () => { await client.close(); await server.close(); } };
};

describe("MCP protocol surface", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => { await close?.(); });

  it("gives instructions to the client", async () => {
    const conn = await connect();
    close = conn.close;
    const instructions = conn.client.getInstructions();
    expect(instructions).toMatch(/list_orders/);
    expect(instructions).toMatch(/BOL_CLIENT_ID/);
  });

  it("names only real tools in the instructions", async () => {
    const conn = await connect();
    close = conn.close;
    const names = new Set((await conn.client.listTools()).tools.map((t) => t.name));
    const mentioned = (conn.client.getInstructions() ?? "").match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];
    expect(mentioned.length).toBeGreaterThan(0);
    for (const name of mentioned) expect(names.has(name), name).toBe(true);
  });

  it("lists tools in the same order for any toolset order", async () => {
    const a = await connect(parseToolsets("orders,offers"));
    const first = (await a.client.listTools()).tools.map((t) => t.name);
    await a.close();
    const b = await connect(parseToolsets("offers,orders"));
    close = b.close;
    const second = (await b.client.listTools()).tools.map((t) => t.name);
    expect(second).toEqual(first);
  });

  it("lists every tool with a title and annotations", async () => {
    const conn = await connect();
    close = conn.close;
    const { tools } = await conn.client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy();
      expect(tool.annotations, tool.name).toBeDefined();
    }
  });
});
