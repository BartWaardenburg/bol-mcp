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
          .describe("Product condition."),
        unitPrice: z.number().min(0).describe("Unit price of the product."),
      }),
    },
    async ({ ean, condition, unitPrice }) => {
      try {
        const commission = await client.getCommission(ean, condition, unitPrice);

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
};
