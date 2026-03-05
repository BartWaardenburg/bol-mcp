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
        "Use the fulfilmentMethod filter to show only FBR (fulfilled by retailer), FBB (fulfilled by bol.com), or ALL orders. " +
        "Use the status filter to show OPEN (awaiting shipment/cancellation), SHIPPED, or ALL orders.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        fulfilmentMethod: z
          .enum(["FBR", "FBB", "ALL"])
          .optional()
          .describe("Filter by fulfilment method: FBR (fulfilled by retailer), FBB (fulfilled by bol.com), or ALL."),
        status: z
          .enum(["OPEN", "SHIPPED", "ALL"])
          .optional()
          .describe("Filter by order status: OPEN (needs handling), SHIPPED (shipped), or ALL."),
        changeIntervalMinute: z
          .number()
          .int()
          .max(60)
          .optional()
          .describe("Filter order items by most recent change within this number of minutes."),
        latestChangeDate: z
          .string()
          .optional()
          .describe("Filter on the date of latest change to an order item (up to 3 months history)."),
        vvbOnly: z
          .boolean()
          .optional()
          .describe("Filter to include only VVB orders."),
      }),
    },
    async ({ page, fulfilmentMethod, status, changeIntervalMinute, latestChangeDate, vvbOnly }) => {
      try {
        const response = await client.getOrders(page, fulfilmentMethod, status, changeIntervalMinute, latestChangeDate, vvbOnly);
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

  server.registerTool(
    "cancel_order_item",
    {
      title: "Cancel Order Item",
      description:
        "Cancel an order item by order item ID. Can be used to confirm a customer cancellation request or to cancel an item you cannot fulfil. " +
        "Returns a process status — the cancellation is processed asynchronously. " +
        "Always review the order with get_order before cancelling.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        orderItemId: z.string().min(1).describe("The order item ID to cancel."),
        reasonCode: z
          .enum([
            "OUT_OF_STOCK",
            "REQUESTED_BY_CUSTOMER",
            "BAD_CONDITION",
            "HIGHER_SHIPCOST",
            "INCORRECT_PRICE",
            "NOT_AVAIL_IN_TIME",
            "NO_BOL_GUARANTEE",
            "ORDERED_TWICE",
            "RETAIN_ITEM",
            "TECH_ISSUE",
            "UNFINDABLE_ITEM",
            "OTHER",
          ])
          .describe("The reason for cancellation."),
      }),
    },
    async ({ orderItemId, reasonCode }) => {
      try {
        const result = await client.cancelOrderItems({
          orderItems: [{ orderItemId, reasonCode }],
        });

        return toTextResult(
          [
            `Cancellation initiated for order item ${orderItemId}`,
            `Reason: ${reasonCode}`,
            `Process status: ${result.processStatusId} (${result.status})`,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
