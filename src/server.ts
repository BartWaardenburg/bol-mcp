import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BolClient } from "./bol-client.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerOfferTools } from "./tools/offers.js";
import { registerShipmentTools } from "./tools/shipments.js";
import { registerReturnTools } from "./tools/returns.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerCommissionTools } from "./tools/commissions.js";
import { registerProcessStatusTools } from "./tools/process-status.js";
import { registerProductTools } from "./tools/products.js";
import { registerProductContentTools } from "./tools/product-content.js";
import { registerInsightTools } from "./tools/insights.js";
import { registerInventoryTools } from "./tools/inventory.js";
import { registerPromotionTools } from "./tools/promotions.js";
import { registerReplenishmentTools } from "./tools/replenishments.js";
import { registerRetailerTools } from "./tools/retailers.js";
import { registerShippingLabelTools } from "./tools/shipping-labels.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerTransportTools } from "./tools/transports.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export type Toolset =
  | "orders"
  | "offers"
  | "shipments"
  | "returns"
  | "invoices"
  | "commissions"
  | "process-status"
  | "products"
  | "product-content"
  | "insights"
  | "inventory"
  | "promotions"
  | "replenishments"
  | "retailers"
  | "shipping-labels"
  | "subscriptions"
  | "transports";

const ALL_TOOLSETS: Toolset[] = [
  "orders",
  "offers",
  "shipments",
  "returns",
  "invoices",
  "commissions",
  "process-status",
  "products",
  "product-content",
  "insights",
  "inventory",
  "promotions",
  "replenishments",
  "retailers",
  "shipping-labels",
  "subscriptions",
  "transports",
];

export const parseToolsets = (env?: string): Set<Toolset> => {
  if (!env) return new Set(ALL_TOOLSETS);

  const requested = env.split(",").map((s) => s.trim().toLowerCase());
  const valid = new Set<Toolset>();

  for (const name of requested) {
    if (ALL_TOOLSETS.includes(name as Toolset)) {
      valid.add(name as Toolset);
    }
  }

  return valid.size > 0 ? valid : new Set(ALL_TOOLSETS);
};

type ToolRegisterer = (server: McpServer, client: BolClient) => void;

const toolsetRegistry: Record<Toolset, ToolRegisterer[]> = {
  orders: [registerOrderTools],
  offers: [registerOfferTools],
  shipments: [registerShipmentTools],
  returns: [registerReturnTools],
  invoices: [registerInvoiceTools],
  commissions: [registerCommissionTools],
  "process-status": [registerProcessStatusTools],
  products: [registerProductTools],
  "product-content": [registerProductContentTools],
  insights: [registerInsightTools],
  inventory: [registerInventoryTools],
  promotions: [registerPromotionTools],
  replenishments: [registerReplenishmentTools],
  retailers: [registerRetailerTools],
  "shipping-labels": [registerShippingLabelTools],
  subscriptions: [registerSubscriptionTools],
  transports: [registerTransportTools],
};

export const createServer = (
  client: BolClient,
  toolsets?: Set<Toolset>,
): McpServer => {
  const server = new McpServer({
    name: "bol-mcp",
    version,
  });

  const enabled = toolsets ?? new Set(ALL_TOOLSETS);
  const registered = new Set<ToolRegisterer>();

  for (const toolset of enabled) {
    const registerers = toolsetRegistry[toolset];

    for (const register of registerers) {
      if (!registered.has(register)) {
        registered.add(register);
        register(server, client);
      }
    }
  }

  return server;
};
