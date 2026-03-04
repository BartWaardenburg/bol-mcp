import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerShipmentTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_shipments",
    {
      title: "List Shipments",
      description:
        "List shipments from bol.com. Optionally filter by order ID to see shipments for a specific order.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        orderId: z.string().optional().describe("Filter shipments by order ID."),
      }),
    },
    async ({ page, orderId }) => {
      try {
        const response = await client.getShipments(page, orderId);
        const shipments = response.shipments ?? [];

        if (shipments.length === 0) {
          return toTextResult("No shipments found.");
        }

        return toTextResult(
          [
            `Shipments (page ${page}): ${shipments.length} results`,
            ...shipments.map((s) =>
              [
                `  - Shipment ${s.shipmentId}`,
                s.shipmentDateTime ? `    Date: ${s.shipmentDateTime}` : null,
                s.order ? `    Order: ${s.order.orderId}` : null,
                s.transport?.trackAndTrace ? `    Tracking: ${s.transport.trackAndTrace}` : null,
                s.shipmentItems ? `    Items: ${s.shipmentItems.length}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { shipments } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_shipment",
    {
      title: "Get Shipment Details",
      description:
        "Get detailed information about a specific shipment including items, transport/tracking info, and shipping details.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        shipmentId: z.string().min(1).describe("The bol.com shipment ID."),
      }),
    },
    async ({ shipmentId }) => {
      try {
        const shipment = await client.getShipment(shipmentId);

        return toTextResult(
          [
            `Shipment: ${shipment.shipmentId}`,
            shipment.shipmentDateTime ? `Date: ${shipment.shipmentDateTime}` : null,
            shipment.shipmentReference ? `Reference: ${shipment.shipmentReference}` : null,
            shipment.order ? `Order: ${shipment.order.orderId}` : null,
            shipment.transport?.transporterCode ? `Transporter: ${shipment.transport.transporterCode}` : null,
            shipment.transport?.trackAndTrace ? `Tracking: ${shipment.transport.trackAndTrace}` : null,
            shipment.shipmentDetails?.firstName
              ? `Ship to: ${shipment.shipmentDetails.firstName} ${shipment.shipmentDetails.surname ?? ""}, ${shipment.shipmentDetails.city ?? ""}`
              : null,
            shipment.shipmentItems
              ? `Items (${shipment.shipmentItems.length}):\n${shipment.shipmentItems.map((item) => `  - Order item ${item.orderItemId} (order ${item.orderId})`).join("\n")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          shipment as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_shipment",
    {
      title: "Create Shipment",
      description:
        "Create a shipment for one or more order items. You must provide the order item IDs and optionally transport details (transporter code and track & trace). " +
        "Returns a process status — the shipment is created asynchronously. Use get_process_status to check completion. " +
        "Always verify the order item IDs with get_order before creating a shipment.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        orderItems: z
          .array(
            z.object({
              orderItemId: z.string().min(1).describe("The order item ID to ship."),
            }),
          )
          .min(1)
          .describe("Order items to include in the shipment."),
        shipmentReference: z.string().optional().describe("Your reference for this shipment."),
        shippingLabelId: z.string().optional().describe("Shipping label ID if using bol.com shipping labels."),
        transport: z
          .object({
            transporterCode: z.string().min(1).describe("Transporter code (e.g. 'TNT', 'DHL', 'POSTNL', 'DPD', 'BPOST_BE')."),
            trackAndTrace: z.string().optional().describe("Track and trace code from the transporter."),
          })
          .optional()
          .describe("Transport details. Required for FBR shipments."),
      }),
    },
    async ({ orderItems, shipmentReference, shippingLabelId, transport }) => {
      try {
        const result = await client.createShipment({
          orderItems,
          ...(shipmentReference !== undefined ? { shipmentReference } : {}),
          ...(shippingLabelId !== undefined ? { shippingLabelId } : {}),
          ...(transport !== undefined ? { transport } : {}),
        });

        return toTextResult(
          [
            `Shipment creation initiated for ${orderItems.length} item(s)`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            "Use get_process_status to check when the shipment is created.",
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
};
