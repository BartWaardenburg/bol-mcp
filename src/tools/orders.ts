import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerOrderTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_orders",
    {
      title: "List Orders",
      description:
        "List recent orders from bol.com. Returns orders with their items, shipping details, and status. " +
        "Use the fulfilmentMethod filter to show only FBR (fulfilled by retailer) or FBB (fulfilled by bol.com) orders.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        fulfilmentMethod: z
          .enum(["FBR", "FBB"])
          .optional()
          .describe("Filter by fulfilment method: FBR (fulfilled by retailer) or FBB (fulfilled by bol.com)."),
      }),
    },
    async ({ page, fulfilmentMethod }) => {
      try {
        const response = await client.getOrders(page, fulfilmentMethod);
        const orders = response.orders ?? [];

        if (orders.length === 0) {
          return toTextResult("No orders found.");
        }

        return toTextResult(
          [
            `Orders (page ${page}): ${orders.length} results`,
            ...orders.map((o) =>
              [
                `  - Order ${o.orderId}`,
                o.dateTimeOrderPlaced ? `    Placed: ${o.dateTimeOrderPlaced}` : null,
                `    Items: ${o.orderItems.length}`,
                ...o.orderItems.map((item) =>
                  `      ${item.ean} - ${item.title ?? "unknown"} x${item.quantity} @ ${item.offerPrice}`,
                ),
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { orders } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_order",
    {
      title: "Get Order Details",
      description:
        "Get detailed information about a specific order including order items, shipping details, billing details, and fulfilment status.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        orderId: z.string().min(1).describe("The bol.com order ID."),
      }),
    },
    async ({ orderId }) => {
      try {
        const order = await client.getOrder(orderId);

        return toTextResult(
          [
            `Order: ${order.orderId}`,
            order.dateTimeOrderPlaced ? `Placed: ${order.dateTimeOrderPlaced}` : null,
            order.shipmentDetails?.firstName
              ? `Ship to: ${order.shipmentDetails.firstName} ${order.shipmentDetails.surname ?? ""}, ${order.shipmentDetails.city ?? ""}`
              : null,
            `Items (${order.orderItems.length}):`,
            ...order.orderItems.map((item) =>
              [
                `  - ${item.orderItemId}: ${item.ean}`,
                `    ${item.title ?? "unknown"} x${item.quantity} @ ${item.offerPrice}`,
                `    Fulfilment: ${item.fulfilmentMethod} (${item.fulfilmentStatus ?? "unknown"})`,
                item.latestDeliveryDate ? `    Latest delivery: ${item.latestDeliveryDate}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ]
            .filter(Boolean)
            .join("\n"),
          order as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
