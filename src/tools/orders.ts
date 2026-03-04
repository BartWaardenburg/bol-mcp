import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import type { OrderItem } from "../types.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

/** Helper to extract EAN from v10 nested structure or v9 flat field */
const getEan = (item: OrderItem): string =>
  item.product?.ean ?? item.ean ?? "unknown";

/** Helper to extract title from v10 nested structure or v9 flat field */
const getTitle = (item: OrderItem): string =>
  item.product?.title ?? item.title ?? "unknown";

/** Helper to extract unit price from v10 or v9 field */
const getUnitPrice = (item: OrderItem): number | undefined =>
  item.unitPrice ?? item.offerPrice;

/** Helper to extract fulfilment method from v10 nested or v9 flat */
const getFulfilmentMethod = (item: OrderItem): string =>
  item.fulfilment?.method ?? item.fulfilmentMethod ?? "unknown";

export const registerOrderTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_orders",
    {
      title: "List Orders",
      description:
        "List recent orders from bol.com. Returns orders with their items, shipping details, and status. " +
        "Use the fulfilmentMethod filter to show only FBR (fulfilled by retailer) or FBB (fulfilled by bol.com) orders. " +
        "Use the status filter to show OPEN (awaiting shipment/cancellation) or ALL orders.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        fulfilmentMethod: z
          .enum(["FBR", "FBB"])
          .optional()
          .describe("Filter by fulfilment method: FBR (fulfilled by retailer) or FBB (fulfilled by bol.com)."),
        status: z
          .enum(["OPEN", "SHIPPED", "ALL"])
          .optional()
          .describe("Filter by order status: OPEN (needs handling), SHIPPED (shipped in last 48h), or ALL."),
      }),
    },
    async ({ page, fulfilmentMethod, status }) => {
      try {
        const response = await client.getOrders(page, fulfilmentMethod, status);
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
                o.orderPlacedDateTime ? `    Placed: ${o.orderPlacedDateTime}` : null,
                `    Items: ${o.orderItems.length}`,
                ...o.orderItems.map((item) =>
                  `      ${getEan(item)} - ${getTitle(item)} x${item.quantity} @ ${getUnitPrice(item) ?? "N/A"}`,
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
            order.orderPlacedDateTime ? `Placed: ${order.orderPlacedDateTime}` : null,
            order.shipmentDetails?.firstName
              ? `Ship to: ${order.shipmentDetails.firstName} ${order.shipmentDetails.surname ?? ""}, ${order.shipmentDetails.city ?? ""}`
              : null,
            `Items (${order.orderItems.length}):`,
            ...order.orderItems.map((item) =>
              [
                `  - ${item.orderItemId}: ${getEan(item)}`,
                `    ${getTitle(item)} x${item.quantity} @ ${getUnitPrice(item) ?? "N/A"}`,
                `    Fulfilment: ${getFulfilmentMethod(item)}`,
                item.quantityShipped !== undefined ? `    Shipped: ${item.quantityShipped}` : null,
                item.quantityCancelled !== undefined ? `    Cancelled: ${item.quantityCancelled}` : null,
                item.fulfilment?.latestDeliveryDate ? `    Latest delivery: ${item.fulfilment.latestDeliveryDate}` : null,
                item.fulfilment?.expiryDate ? `    Expiry: ${item.fulfilment.expiryDate}` : null,
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
