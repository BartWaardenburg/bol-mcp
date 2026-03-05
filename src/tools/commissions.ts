import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerCommissionTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_commission",
    {
      title: "Get Commission",
      description:
        "Get the commission for a product based on EAN, condition, and unit price. " +
        "Returns the fixed amount, percentage, total cost, and any active reductions.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().min(8).max(13).describe("EAN (European Article Number) barcode of the product."),
        condition: z
          .enum(["NEW", "AS_NEW", "GOOD", "REASONABLE", "MODERATE"])
          .optional()
          .describe("Product condition. Defaults to NEW."),
        unitPrice: z.number().min(0).max(9999).describe("Unit price of the product with two decimals precision."),
      }),
    },
    async ({ ean, condition, unitPrice }) => {
      try {
        const commission = await client.getCommission(ean, condition ?? "NEW", unitPrice);

        return toTextResult(
          [
            `Commission for EAN ${commission.ean} (${commission.condition}):`,
            `  Unit price: ${commission.unitPrice}`,
            `  Fixed amount: ${commission.fixedAmount}`,
            `  Percentage: ${commission.percentage}%`,
            `  Total cost: ${commission.totalCost}`,
            commission.totalCostWithoutReduction !== undefined
              ? `  Total cost without reduction: ${commission.totalCostWithoutReduction}`
              : null,
            commission.reductions && commission.reductions.length > 0
              ? [
                  "  Active reductions:",
                  ...commission.reductions.map(
                    (r) => `    - Max price: ${r.maximumPrice}, reduction: ${r.costReduction} (${r.startDate} to ${r.endDate})`,
                  ),
                ].join("\n")
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          commission as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_bulk_commissions",
    {
      title: "Get Bulk Commissions",
      description:
        "Get commissions and possible reductions for multiple products in bulk. " +
        "Provide EAN, unit price, and optionally condition for each product.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        commissionQueries: z
          .array(
            z.object({
              ean: z.string().min(8).max(13).describe("EAN barcode of the product."),
              unitPrice: z.number().min(0).max(9999).describe("Unit price with two decimals precision."),
              condition: z
                .enum(["NEW", "AS_NEW", "GOOD", "REASONABLE", "MODERATE"])
                .optional()
                .describe("Product condition."),
            }),
          )
          .min(1)
          .max(100)
          .describe("List of commission queries (max 100)."),
      }),
    },
    async ({ commissionQueries }) => {
      try {
        const result = await client.getBulkCommissions({ commissionQueries });
        const commissions = result.commissions ?? [];

        return toTextResult(
          [
            `Bulk commissions: ${commissions.length} results`,
            ...commissions.map(
              (c) =>
                `  - EAN ${c.ean} (${c.condition}): total ${c.totalCost} (fixed ${c.fixedAmount} + ${c.percentage}%)`,
            ),
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_commission_rates",
    {
      title: "Get Commission Rates (BETA)",
      description:
        "Get a list of all commission rates by EAN. Returns commission rate tables with price ranges and conditions. " +
        "This is a BETA endpoint.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        products: z
          .array(
            z.object({
              ean: z.string().min(8).max(13).describe("EAN barcode of the product."),
            }),
          )
          .min(1)
          .max(100)
          .describe("List of products by EAN (max 100)."),
      }),
    },
    async ({ products }) => {
      try {
        const result = await client.getCommissionRates({ products });

        return toTextResult(
          [
            `Commission rates: ${result.successfulQueries?.length ?? 0} successful, ${result.failedQueries?.length ?? 0} failed`,
          ].join("\n"),
          result as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
