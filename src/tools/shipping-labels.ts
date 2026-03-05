import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const OrderItemSchema = z.object({
  orderItemId: z.string().min(1).describe("The order item ID."),
  quantity: z.number().int().min(1).optional().describe("Quantity for this order item. Omit for full quantity."),
});

export const registerShippingLabelTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_delivery_options",
    {
      title: "Get Delivery Options",
      description:
        "Get available delivery and shipping options for one or more order items. " +
        "Shows available shipping methods with prices. Use the shippingLabelOfferId from the results when creating a shipping label.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        orderItems: z
          .array(OrderItemSchema)
          .min(1)
          .describe("Order items to get delivery options for."),
      }),
    },
    async ({ orderItems }) => {
      try {
        const options = await client.getDeliveryOptions({ orderItems });
        const deliveryOptions = options.deliveryOptions ?? [];

        if (deliveryOptions.length === 0) {
          return toTextResult("No delivery options available for the given order items.");
        }

        return toTextResult(
          [
            `Delivery Options (${deliveryOptions.length} available):`,
            ...deliveryOptions.map((opt: Record<string, unknown>) =>
              [
                `  - ${opt.shippingLabelOfferId}`,
                opt.transporterCode ? `    Transporter: ${opt.transporterCode}` : null,
                opt.labelType ? `    Label Type: ${opt.labelType}` : null,
                opt.labelPrice ? `    Price: ${(opt.labelPrice as Record<string, unknown>).totalPrice ?? JSON.stringify(opt.labelPrice)}` : null,
                opt.handoverDetails ? `    Handover: ${JSON.stringify(opt.handoverDetails)}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          options as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_shipping_label",
    {
      title: "Create Shipping Label",
      description:
        "Create a shipping label for one or more order items. Requires a shippingLabelOfferId from get_delivery_options. " +
        "Returns a process status — the label is created asynchronously. Use get_process_status to check completion.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        orderItems: z
          .array(OrderItemSchema)
          .min(1)
          .describe("Order items to create the shipping label for."),
        shippingLabelOfferId: z
          .string()
          .uuid()
          .describe("The shipping label offer ID from get_delivery_options."),
      }),
    },
    async ({ orderItems, shippingLabelOfferId }) => {
      try {
        const result = await client.createShippingLabel({ orderItems, shippingLabelOfferId });

        return toTextResult(
          [
            `Shipping label creation initiated for ${orderItems.length} item(s)`,
            `Shipping Label Offer: ${shippingLabelOfferId}`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            "Use get_process_status to check when the label is created.",
          ]
            .filter(Boolean)
            .join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_shipping_label",
    {
      title: "Get Shipping Label",
      description:
        "Download a shipping label by its ID. Returns the label data (PDF).",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        shippingLabelId: z.string().min(1).describe("The shipping label ID."),
      }),
    },
    async ({ shippingLabelId }) => {
      try {
        const data = await client.getShippingLabel(shippingLabelId);

        return toTextResult(
          typeof data === "string" ? `Shipping label ${shippingLabelId} retrieved.` : JSON.stringify(data),
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
