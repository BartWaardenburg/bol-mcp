import { describe, it, expect } from "vitest";
import { createServer, parseToolsets } from "./server.js";
import type { BolClient } from "./bol-client.js";

const mockClient = {} as BolClient;

type RegisteredTool = { annotations?: Record<string, unknown> };
type ServerWithTools = { _registeredTools: Record<string, RegisteredTool> };

const getTools = (toolsets?: Set<string>): Record<string, RegisteredTool> =>
  (createServer(mockClient, toolsets as never) as unknown as ServerWithTools)._registeredTools;

describe("createServer", () => {
  it("creates a server", () => {
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });

  it("registers all tools", () => {
    const tools = getTools();
    expect(Object.keys(tools)).toHaveLength(76);
  });

  it("registers all expected tool names", () => {
    const tools = getTools();

    const expectedTools = [
      // Orders
      "list_orders",
      "get_order",
      "cancel_order_item",
      // Offers
      "get_offer",
      "create_offer",
      "update_offer",
      "delete_offer",
      "update_offer_price",
      "update_offer_stock",
      "request_offer_export",
      "get_offer_export",
      "request_unpublished_offer_report",
      "get_unpublished_offer_report",
      // Shipments
      "list_shipments",
      "get_shipment",
      "create_shipment",
      "get_invoice_requests",
      "upload_shipment_invoice",
      // Returns
      "list_returns",
      "get_return",
      "handle_return",
      "create_return",
      // Invoices
      "list_invoices",
      "get_invoice",
      "get_invoice_specification",
      // Commissions
      "get_commission",
      "get_bulk_commissions",
      "get_commission_rates",
    ];

    for (const name of expectedTools) {
      expect(name in tools, `Tool "${name}" should be registered`).toBe(true);
    }
  });

  it("all tools have annotations", () => {
    const tools = getTools();

    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.annotations, `Tool "${name}" should have annotations`).toBeDefined();
    }
  });
});

describe("parseToolsets", () => {
  it("returns all toolsets when env is undefined", () => {
    const result = parseToolsets(undefined);
    expect(result.size).toBe(17);
  });

  it("returns all toolsets when env is empty", () => {
    const result = parseToolsets("");
    expect(result.size).toBe(17);
  });

  it("parses a single toolset", () => {
    const result = parseToolsets("orders");
    expect(result).toEqual(new Set(["orders"]));
  });

  it("parses multiple toolsets", () => {
    const result = parseToolsets("orders,offers,shipments");
    expect(result).toEqual(new Set(["orders", "offers", "shipments"]));
  });

  it("ignores invalid toolset names", () => {
    const result = parseToolsets("orders,invalid,offers");
    expect(result).toEqual(new Set(["orders", "offers"]));
  });

  it("returns all toolsets if all names are invalid", () => {
    const result = parseToolsets("invalid,unknown");
    expect(result.size).toBe(17);
  });

  it("handles whitespace in toolset names", () => {
    const result = parseToolsets(" orders , offers ");
    expect(result).toEqual(new Set(["orders", "offers"]));
  });
});

describe("toolset filtering", () => {
  it("registers only order tools when orders toolset is selected", () => {
    const tools = getTools(new Set(["orders"]) as never);
    expect("list_orders" in tools).toBe(true);
    expect("get_order" in tools).toBe(true);
    expect("get_offer" in tools).toBe(false);
    expect("list_shipments" in tools).toBe(false);
  });

  it("registers only offer tools when offers toolset is selected", () => {
    const tools = getTools(new Set(["offers"]) as never);
    expect("get_offer" in tools).toBe(true);
    expect("create_offer" in tools).toBe(true);
    expect("update_offer" in tools).toBe(true);
    expect("delete_offer" in tools).toBe(true);
    expect("update_offer_price" in tools).toBe(true);
    expect("update_offer_stock" in tools).toBe(true);
    expect("list_orders" in tools).toBe(false);
  });

  it("registers only shipment tools when shipments toolset is selected", () => {
    const tools = getTools(new Set(["shipments"]) as never);
    expect("list_shipments" in tools).toBe(true);
    expect("get_shipment" in tools).toBe(true);
    expect("create_shipment" in tools).toBe(true);
    expect("list_orders" in tools).toBe(false);
  });

  it("registers only return tools when returns toolset is selected", () => {
    const tools = getTools(new Set(["returns"]) as never);
    expect("list_returns" in tools).toBe(true);
    expect("get_return" in tools).toBe(true);
    expect("handle_return" in tools).toBe(true);
    expect("list_orders" in tools).toBe(false);
  });

  it("registers only invoice tools when invoices toolset is selected", () => {
    const tools = getTools(new Set(["invoices"]) as never);
    expect("list_invoices" in tools).toBe(true);
    expect("get_invoice" in tools).toBe(true);
    expect("list_orders" in tools).toBe(false);
  });

  it("registers only commission tools when commissions toolset is selected", () => {
    const tools = getTools(new Set(["commissions"]) as never);
    expect("get_commission" in tools).toBe(true);
    expect("list_orders" in tools).toBe(false);
  });

  it("does not register duplicate tools when multiple toolsets are selected", () => {
    const tools = getTools(new Set(["orders", "offers", "shipments"]) as never);
    const toolNames = Object.keys(tools);
    const unique = new Set(toolNames);
    expect(toolNames.length).toBe(unique.size);
  });
});
