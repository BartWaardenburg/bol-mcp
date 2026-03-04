import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const BundlePriceSchema = z.object({
  quantity: z.number().int().min(1).describe("Minimum quantity for this price tier."),
  unitPrice: z.number().min(0).describe("Unit price for this quantity tier."),
});

const PricingSchema = z.object({
  bundlePrices: z.array(BundlePriceSchema).min(1).describe("Price tiers. At minimum one entry with quantity 1."),
});

const StockSchema = z.object({
  amount: z.number().int().min(0).describe("Stock amount."),
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
  comment: z.string().optional().describe("Comment about the condition."),
});

const FulfilmentSchema = z.object({
  method: z.enum(["FBR", "FBB"]).describe("FBR (fulfilled by retailer) or FBB (fulfilled by bol.com)."),
  deliveryCode: z
    .string()
    .optional()
    .describe("Delivery promise code (e.g. '24uurs-21', '1-2d', '2-3d', '3-5d', '4-8d')."),
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
        reference: z.string().optional().describe("Your internal reference for this offer."),
        onHoldByRetailer: z.boolean().optional().describe("Put the offer on hold (not visible on bol.com)."),
        unknownProductTitle: z.string().optional().describe("Title for products not yet known by bol.com."),
        pricing: PricingSchema.describe("Pricing with bundle prices."),
        stock: StockSchema.describe("Stock information."),
        fulfilment: FulfilmentSchema.describe("Fulfilment method and delivery code."),
      }),
    },
    async ({ ean, condition, reference, onHoldByRetailer, unknownProductTitle, pricing, stock, fulfilment }) => {
      try {
        const result = await client.createOffer({
          ean,
          condition,
          ...(reference !== undefined ? { reference } : {}),
          ...(onHoldByRetailer !== undefined ? { onHoldByRetailer } : {}),
          ...(unknownProductTitle !== undefined ? { unknownProductTitle } : {}),
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
        reference: z.string().optional().describe("Your internal reference for this offer."),
        onHoldByRetailer: z.boolean().optional().describe("Put the offer on hold (not visible on bol.com)."),
        unknownProductTitle: z.string().optional().describe("Title for products not yet known by bol.com."),
        fulfilment: FulfilmentSchema.optional().describe("Updated fulfilment method and delivery code."),
      }),
    },
    async ({ offerId, reference, onHoldByRetailer, unknownProductTitle, fulfilment }) => {
      try {
        const result = await client.updateOffer(offerId, {
          ...(reference !== undefined ? { reference } : {}),
          ...(onHoldByRetailer !== undefined ? { onHoldByRetailer } : {}),
          ...(unknownProductTitle !== undefined ? { unknownProductTitle } : {}),
          ...(fulfilment !== undefined ? { fulfilment } : {}),
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
        amount: z.number().int().min(0).describe("New stock amount."),
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
};
