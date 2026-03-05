import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerReplenishmentTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_replenishments",
    {
      title: "List FBB Replenishments",
      description:
        "List FBB (Fulfilled by bol.com) replenishments. Optionally filter by reference, EAN, date range, or state.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        reference: z.string().optional().describe("Filter by replenishment reference."),
        ean: z.string().optional().describe("Filter by EAN."),
        startDate: z.string().optional().describe("Filter by start date (YYYY-MM-DD)."),
        endDate: z.string().optional().describe("Filter by end date (YYYY-MM-DD)."),
        states: z.array(z.string()).optional().describe("Filter by replenishment states."),
      }),
    },
    async ({ page, reference, ean, startDate, endDate, states }) => {
      try {
        const response = await client.getReplenishments(page, reference, ean, startDate, endDate, states);
        const replenishments = response.replenishments ?? [];

        if (replenishments.length === 0) {
          return toTextResult("No replenishments found.");
        }

        return toTextResult(
          [
            `Replenishments (page ${page}): ${replenishments.length} results`,
            ...replenishments.map((r: Record<string, unknown>) =>
              [
                `  - Replenishment ${r.replenishmentId}`,
                r.reference ? `    Reference: ${r.reference}` : null,
                r.creationDateTime ? `    Created: ${r.creationDateTime}` : null,
                r.state ? `    State: ${r.state}` : null,
                r.deliveryDateTime ? `    Delivery: ${r.deliveryDateTime}` : null,
                r.numberOfLoadCarriers !== undefined ? `    Load carriers: ${r.numberOfLoadCarriers}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { replenishments } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_replenishment",
    {
      title: "Get Replenishment Details",
      description:
        "Get detailed information about a specific FBB replenishment including lines, state, delivery info, and load carriers.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        replenishmentId: z.string().min(1).describe("The bol.com replenishment ID."),
      }),
    },
    async ({ replenishmentId }) => {
      try {
        const replenishment = await client.getReplenishment(replenishmentId);
        const r = replenishment as Record<string, unknown>;
        const lines = (r.lines as Array<Record<string, unknown>>) ?? [];

        return toTextResult(
          [
            `Replenishment: ${r.replenishmentId}`,
            r.reference ? `Reference: ${r.reference}` : null,
            r.state ? `State: ${r.state}` : null,
            r.creationDateTime ? `Created: ${r.creationDateTime}` : null,
            r.deliveryDateTime ? `Delivery: ${r.deliveryDateTime}` : null,
            r.numberOfLoadCarriers !== undefined ? `Load carriers: ${r.numberOfLoadCarriers}` : null,
            lines.length > 0
              ? `Lines (${lines.length}):\n${lines.map((l) => `  - EAN ${l.ean} x${l.quantity}`).join("\n")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          replenishment as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_replenishment",
    {
      title: "Create FBB Replenishment",
      description:
        "Create a new FBB (Fulfilled by bol.com) replenishment. Provide a reference, delivery date, and lines with EAN and quantity. " +
        "Returns a process status — the replenishment is created asynchronously. Use get_process_status to check completion.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        reference: z.string().min(1).describe("Your reference for this replenishment."),
        labelingByBol: z.boolean().describe("Whether bol.com should label the products."),
        numberOfLoadCarriers: z.number().int().min(1).max(66).describe("Number of load carriers (1-66)."),
        deliveryInfo: z
          .object({
            expectedDeliveryDate: z.string().min(1).describe("Expected delivery date (YYYY-MM-DD)."),
            transporterCode: z.string().min(1).describe("Transporter code."),
          })
          .optional()
          .describe("Delivery information (required when not using pickup appointment)."),
        pickupAppointment: z
          .object({
            address: z.object({
              streetName: z.string().describe("Street name."),
              houseNumber: z.string().describe("House number."),
              houseNumberExtension: z.string().optional().describe("House number extension."),
              zipCode: z.string().describe("Zip code."),
              city: z.string().describe("City."),
              countryCode: z.string().describe("Country code."),
              attentionOf: z.string().describe("Attention of."),
            }).describe("Pickup address."),
            pickupTimeSlot: z.object({
              fromDateTime: z.string().describe("Start of pickup time slot (ISO 8601)."),
              untilDateTime: z.string().describe("End of pickup time slot (ISO 8601)."),
            }).describe("Pickup time slot."),
            commentToTransporter: z.string().optional().describe("Comment to the transporter."),
          })
          .optional()
          .describe("Pickup appointment details."),
        lines: z
          .array(
            z.object({
              ean: z.string().min(1).describe("EAN of the product."),
              quantity: z.number().int().min(1).describe("Quantity to replenish."),
            }),
          )
          .min(1)
          .describe("Lines with EAN and quantity to replenish."),
      }),
    },
    async ({ reference, labelingByBol, numberOfLoadCarriers, deliveryInfo, pickupAppointment, lines }) => {
      try {
        const result = await client.createReplenishment({
          reference,
          labelingByBol,
          numberOfLoadCarriers,
          ...(deliveryInfo !== undefined ? { deliveryInfo } : {}),
          ...(pickupAppointment !== undefined ? { pickupAppointment } : {}),
          lines,
        });

        return toTextResult(
          [
            `Replenishment creation initiated`,
            `Reference: ${reference}`,
            `Labeling by bol: ${labelingByBol}`,
            `Load carriers: ${numberOfLoadCarriers}`,
            `Lines: ${lines.length}`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            "Use get_process_status to check when the replenishment is created.",
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
    "update_replenishment",
    {
      title: "Update Replenishment",
      description:
        "Update a replenishment, for example to cancel it or update delivery info and load carriers. " +
        "Returns a process status — changes are applied asynchronously.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        replenishmentId: z.string().min(1).describe("The bol.com replenishment ID to update."),
        state: z.enum(["CANCELLED"]).optional().describe("Set the replenishment state (e.g. CANCELLED)."),
        deliveryInfo: z
          .object({
            expectedDeliveryDate: z.string().min(1).describe("Expected delivery date (YYYY-MM-DD)."),
          })
          .optional()
          .describe("Updated delivery information."),
        numberOfLoadCarriers: z
          .number()
          .int()
          .min(1)
          .max(66)
          .optional()
          .describe("Number of load carriers (1-66)."),
        loadCarriers: z
          .array(
            z.object({
              sscc: z.string().min(1).describe("SSCC code of the load carrier."),
            }),
          )
          .optional()
          .describe("Load carriers with SSCC codes."),
      }),
    },
    async ({ replenishmentId, state, deliveryInfo, numberOfLoadCarriers, loadCarriers }) => {
      try {
        const data = {
          ...(state !== undefined ? { state } : {}),
          ...(deliveryInfo !== undefined ? { deliveryInfo } : {}),
          ...(numberOfLoadCarriers !== undefined ? { numberOfLoadCarriers } : {}),
          ...(loadCarriers !== undefined ? { loadCarriers } : {}),
        };
        const result = await client.updateReplenishment(replenishmentId, data);

        return toTextResult(
          [
            `Replenishment update initiated for ${replenishmentId}`,
            `Process status: ${result.processStatusId} (${result.status})`,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_delivery_dates",
    {
      title: "Get FBB Delivery Dates",
      description:
        "Get available delivery dates for FBB (Fulfilled by bol.com) replenishments.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({}),
    },
    async () => {
      try {
        const response = await client.getDeliveryDates();
        const dates = (response as Record<string, unknown>).deliveryDates ?? response;

        if (Array.isArray(dates) && dates.length === 0) {
          return toTextResult("No delivery dates available.");
        }

        return toTextResult(
          [
            `Available delivery dates:`,
            ...(Array.isArray(dates)
              ? dates.map((d: unknown) => `  - ${typeof d === "string" ? d : JSON.stringify(d)}`)
              : [JSON.stringify(dates)]),
          ].join("\n"),
          response as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_pickup_time_slots",
    {
      title: "Get Pickup Time Slots",
      description:
        "Get available pickup time slots for a given address and number of load carriers.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        address: z.object({
          streetName: z.string().describe("Street name."),
          houseNumber: z.string().describe("House number."),
          houseNumberExtension: z.string().optional().describe("House number extension."),
          zipCode: z.string().describe("Zip code."),
          city: z.string().describe("City."),
          countryCode: z.string().describe("Country code (e.g. NL, BE)."),
        }).describe("Pickup address."),
        numberOfLoadCarriers: z.number().int().min(1).max(66).describe("Number of load carriers (1-66)."),
      }),
    },
    async ({ address, numberOfLoadCarriers }) => {
      try {
        const response = await client.getPickupTimeSlots({ address, numberOfLoadCarriers });
        const slots = (response as Record<string, unknown>).timeSlots ?? response;

        if (Array.isArray(slots) && slots.length === 0) {
          return toTextResult("No pickup time slots available.");
        }

        return toTextResult(
          [
            "Pickup time slots:",
            ...(Array.isArray(slots)
              ? slots.map((s: Record<string, unknown>) =>
                  `  - ${s.fromDateTime ?? s.from ?? ""} to ${s.toDateTime ?? s.to ?? ""}`,
                )
              : [JSON.stringify(slots)]),
          ].join("\n"),
          response as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "request_product_destinations",
    {
      title: "Request Product Destinations",
      description:
        "Request product warehouse destinations for the given EANs. Returns a process status — use the product destinations ID to retrieve results with get_product_destinations.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        eans: z.array(z.string().min(1)).min(1).describe("List of EANs to request destinations for."),
      }),
    },
    async ({ eans }) => {
      try {
        const result = await client.requestProductDestinations({
          eans: eans.map((ean) => ({ ean })),
        });

        return toTextResult(
          [
            `Product destinations requested for ${eans.length} EAN(s)`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            "Use get_product_destinations with the entity ID to retrieve the results.",
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
    "get_product_destinations",
    {
      title: "Get Product Destinations",
      description:
        "Get product warehouse destinations by product destinations ID. Use after requesting destinations with request_product_destinations.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        productDestinationsId: z.string().min(1).describe("The product destinations ID from request_product_destinations."),
      }),
    },
    async ({ productDestinationsId }) => {
      try {
        const response = await client.getProductDestinations(productDestinationsId);
        const destinations = (response as Record<string, unknown>).productDestinations ?? response;

        if (Array.isArray(destinations) && destinations.length === 0) {
          return toTextResult("No product destinations found.");
        }

        return toTextResult(
          [
            `Product destinations (${productDestinationsId}):`,
            ...(Array.isArray(destinations)
              ? destinations.map((d: Record<string, unknown>) =>
                  [
                    `  - EAN: ${d.ean}`,
                    d.destination ? `    Destination: ${d.destination}` : null,
                    d.warehouseCode ? `    Warehouse: ${d.warehouseCode}` : null,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                )
              : [JSON.stringify(destinations)]),
          ].join("\n"),
          response as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_load_carrier_labels",
    {
      title: "Get Load Carrier Labels",
      description:
        "Get load carrier labels for a replenishment. Returns label data (PDF).",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        replenishmentId: z.string().min(1).describe("The replenishment ID."),
        labelType: z
          .enum(["WAREHOUSE", "TRANSPORT"])
          .optional()
          .describe("Label type: WAREHOUSE or TRANSPORT."),
      }),
    },
    async ({ replenishmentId, labelType }) => {
      try {
        const data = await client.getLoadCarrierLabels(replenishmentId, labelType);

        return toTextResult(
          typeof data === "string" ? `Load carrier labels retrieved for replenishment ${replenishmentId}.` : JSON.stringify(data),
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_pick_list",
    {
      title: "Get Pick List",
      description:
        "Get the pick list for a replenishment. Returns pick list data (PDF).",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        replenishmentId: z.string().min(1).describe("The replenishment ID."),
      }),
    },
    async ({ replenishmentId }) => {
      try {
        const data = await client.getPickList(replenishmentId);

        return toTextResult(
          typeof data === "string" ? `Pick list retrieved for replenishment ${replenishmentId}.` : JSON.stringify(data),
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "request_product_labels",
    {
      title: "Request Product Labels",
      description:
        "Request product labels for FBB products. Returns label data (PDF). Specify the label format and products with EAN and quantity.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        labelFormat: z
          .enum(["AVERY_J8159", "AVERY_J8160", "AVERY_3474", "DYMO_99012", "BROTHER_DK11209", "ZEBRA_Z_PERFORM_1000T"])
          .describe("Label format."),
        products: z
          .array(
            z.object({
              ean: z.string().min(1).describe("EAN of the product."),
              quantity: z.number().int().min(1).describe("Number of labels to generate."),
            }),
          )
          .min(1)
          .describe("Products with EAN and quantity."),
      }),
    },
    async ({ labelFormat, products }) => {
      try {
        const data = await client.requestProductLabels({ labelFormat, products });

        return toTextResult(
          typeof data === "string" ? `Product labels generated for ${products.length} product(s).` : JSON.stringify(data),
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
