import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const BundlePriceSchema = z.object({
  quantity: z.number().int().min(1).max(24).describe("Minimum quantity for this price tier."),
  unitPrice: z.number().min(1).max(9999).describe("Unit price for this quantity tier."),
});

const PricingSchema = z.object({
  bundlePrices: z.array(BundlePriceSchema).min(1).max(4).describe("Price tiers (max 4). At minimum one entry with quantity 1."),
});

const StockSchema = z.object({
  amount: z.number().int().min(0).max(999).describe("Stock amount."),
  managedByRetailer: z.boolean().describe("Whether stock is managed by the retailer."),
});

const ConditionSchema = z.object({
  name: z
    .enum(["NEW", "AS_NEW", "GOOD", "REASONABLE", "MODERATE"])
    .describe("Condition of the product."),
  category: z
    .enum(["NEW", "SECONDHAND"])
    .optional()
    .describe("Condition category."),
  comment: z.string().max(2000).optional().describe("Comment about the condition. Only allowed if name is not NEW."),
});

const FulfilmentSchema = z.object({
  method: z.enum(["FBR", "FBB"]).describe("FBR (fulfilled by retailer) or FBB (fulfilled by bol.com)."),
  deliveryCode: z
    .enum([
      "24uurs-23", "24uurs-22", "24uurs-21", "24uurs-20", "24uurs-19", "24uurs-18",
      "24uurs-17", "24uurs-16", "24uurs-15", "24uurs-14", "24uurs-13", "24uurs-12",
      "1-2d", "2-3d", "3-5d", "4-8d", "1-8d", "MijnLeverbelofte", "VVB",
    ])
    .optional()
    .describe("Delivery promise code. Only used with FBR."),
});

export const registerOfferTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_offer",
    {
      title: "Get Offer Details",
      description:
        "Get detailed information about a specific offer including EAN, pricing, stock, fulfilment method, and condition.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID."),
      }),
    },
    async ({ offerId }) => {
      try {
        const offer = await client.getOffer(offerId);

        const mainPrice = offer.pricing?.bundlePrices?.find((p) => p.quantity === 1);

        return toTextResult(
          [
            `Offer: ${offer.offerId}`,
            `EAN: ${offer.ean}`,
            offer.reference ? `Reference: ${offer.reference}` : null,
            offer.condition ? `Condition: ${offer.condition.name}${offer.condition.category ? ` (${offer.condition.category})` : ""}` : null,
            mainPrice ? `Price: ${mainPrice.unitPrice}` : null,
            `Stock: ${offer.stock.amount} (managed by retailer: ${offer.stock.managedByRetailer})`,
            `Fulfilment: ${offer.fulfilment.method}${offer.fulfilment.deliveryCode ? ` (${offer.fulfilment.deliveryCode})` : ""}`,
            `On hold: ${offer.onHoldByRetailer}`,
            offer.notPublishableReasons && offer.notPublishableReasons.length > 0
              ? `Not publishable: ${offer.notPublishableReasons.map((r) => r.description).join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          offer as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_offer",
    {
      title: "Create Offer",
      description:
        "Create a new offer on bol.com. Requires EAN, condition, pricing (at least one bundle price with quantity 1), stock, and fulfilment method. " +
        "Returns a process status — the offer is created asynchronously. Use get_process_status to check completion.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().min(8).max(13).describe("EAN (European Article Number) barcode of the product."),
        condition: ConditionSchema.describe("Product condition."),
        reference: z.string().max(100).optional().describe("Your internal reference for this offer (max 100 chars)."),
        onHoldByRetailer: z.boolean().optional().describe("Put the offer on hold (not visible on bol.com)."),
        unknownProductTitle: z.string().max(500).optional().describe("Title for products not yet known by bol.com."),
        economicOperatorId: z.string().optional().describe("Identifier referring to the Economic Operator entity for EU compliance."),
        pricing: PricingSchema.describe("Pricing with bundle prices."),
        stock: StockSchema.describe("Stock information."),
        fulfilment: FulfilmentSchema.describe("Fulfilment method and delivery code."),
      }),
    },
    async ({ ean, condition, reference, onHoldByRetailer, unknownProductTitle, economicOperatorId, pricing, stock, fulfilment }) => {
      try {
        const result = await client.createOffer({
          ean,
          condition,
          ...(reference !== undefined ? { reference } : {}),
          ...(onHoldByRetailer !== undefined ? { onHoldByRetailer } : {}),
          ...(unknownProductTitle !== undefined ? { unknownProductTitle } : {}),
          ...(economicOperatorId !== undefined ? { economicOperatorId } : {}),
          pricing,
          stock,
          fulfilment,
        });

        return toTextResult(
          [
            `Offer creation initiated for EAN ${ean}`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            "Use get_process_status to check when the offer is created.",
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
    "update_offer",
    {
      title: "Update Offer",
      description:
        "Update an existing offer's reference, on-hold status, product title, or fulfilment settings. " +
        "To update pricing or stock, use update_offer_price or update_offer_stock instead. " +
        "Returns a process status — changes are applied asynchronously.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID to update."),
        reference: z.string().max(100).optional().describe("Your internal reference for this offer (max 100 chars)."),
        onHoldByRetailer: z.boolean().optional().describe("Put the offer on hold (not visible on bol.com)."),
        unknownProductTitle: z.string().max(500).optional().describe("Title for products not yet known by bol.com."),
        economicOperatorId: z.string().optional().describe("Identifier referring to the Economic Operator entity for EU compliance."),
        fulfilment: FulfilmentSchema.describe("Fulfilment method and delivery code."),
      }),
    },
    async ({ offerId, reference, onHoldByRetailer, unknownProductTitle, economicOperatorId, fulfilment }) => {
      try {
        const result = await client.updateOffer(offerId, {
          ...(reference !== undefined ? { reference } : {}),
          ...(onHoldByRetailer !== undefined ? { onHoldByRetailer } : {}),
          ...(unknownProductTitle !== undefined ? { unknownProductTitle } : {}),
          ...(economicOperatorId !== undefined ? { economicOperatorId } : {}),
          fulfilment,
        });

        return toTextResult(
          [
            `Offer update initiated for ${offerId}`,
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
    "delete_offer",
    {
      title: "Delete Offer",
      description:
        "Delete an offer from bol.com. This permanently removes the offer — it cannot be undone. " +
        "Always confirm with the user before calling this tool.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID to delete."),
      }),
    },
    async ({ offerId }) => {
      try {
        const result = await client.deleteOffer(offerId);

        return toTextResult(
          [
            `Offer deletion initiated for ${offerId}`,
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
    "update_offer_price",
    {
      title: "Update Offer Price",
      description:
        "Update the pricing for an existing offer. Provide bundle prices with at least one entry for quantity 1. " +
        "Returns a process status — changes are applied asynchronously.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID."),
        pricing: PricingSchema.describe("New pricing with bundle prices."),
      }),
    },
    async ({ offerId, pricing }) => {
      try {
        const result = await client.updateOfferPrice(offerId, { pricing });

        return toTextResult(
          [
            `Price update initiated for offer ${offerId}`,
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
    "update_offer_stock",
    {
      title: "Update Offer Stock",
      description:
        "Update the stock level for an existing offer. " +
        "Returns a process status — changes are applied asynchronously.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID."),
        amount: z.number().int().min(0).max(999).describe("New stock amount."),
        managedByRetailer: z.boolean().describe("Whether stock is managed by the retailer."),
      }),
    },
    async ({ offerId, amount, managedByRetailer }) => {
      try {
        const result = await client.updateOfferStock(offerId, { amount, managedByRetailer });

        return toTextResult(
          [
            `Stock update initiated for offer ${offerId}: ${amount} units`,
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
    "request_offer_export",
    {
      title: "Request Offer Export",
      description:
        "Request an offer export file containing all offers. " +
        "Returns a process status — use get_process_status to get the report ID, then retrieve with get_offer_export.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        format: z.enum(["CSV"]).default("CSV").describe("The file format for the export."),
      }),
    },
    async ({ format }) => {
      try {
        const result = await client.requestOfferExport({ format });

        return toTextResult(
          [
            `Offer export requested (${format})`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Report ID: ${result.entityId}` : null,
            "Use get_process_status to check completion, then get_offer_export to retrieve.",
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
    "get_offer_export",
    {
      title: "Get Offer Export",
      description:
        "Retrieve an offer export file by report ID. The report ID is obtained from the process status after requesting an export.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        reportId: z.string().min(1).describe("The report ID from the offer export request."),
      }),
    },
    async ({ reportId }) => {
      try {
        const data = await client.getOfferExport(reportId);

        return toTextResult(
          typeof data === "string" ? `Offer export retrieved (${reportId}).` : JSON.stringify(data),
          { reportId, data } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "request_unpublished_offer_report",
    {
      title: "Request Unpublished Offer Report",
      description:
        "Request a report of all unpublished offers and reasons. " +
        "Returns a process status — use get_process_status to get the report ID, then retrieve with get_unpublished_offer_report.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({}),
    },
    async () => {
      try {
        const result = await client.requestUnpublishedOfferReport();

        return toTextResult(
          [
            `Unpublished offer report requested`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Report ID: ${result.entityId}` : null,
            "Use get_process_status to check completion, then get_unpublished_offer_report to retrieve.",
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
    "get_unpublished_offer_report",
    {
      title: "Get Unpublished Offer Report",
      description:
        "Retrieve an unpublished offer report by report ID. Contains all unpublished offers and reasons.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        reportId: z.string().min(1).describe("The report ID from the unpublished offer report request."),
      }),
    },
    async ({ reportId }) => {
      try {
        const data = await client.getUnpublishedOfferReport(reportId);

        return toTextResult(
          typeof data === "string" ? `Unpublished offer report retrieved (${reportId}).` : JSON.stringify(data),
          { reportId, data } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
