import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerPromotionTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_promotions",
    {
      title: "List Promotions",
      description:
        "List available promotions on bol.com. " +
        "Filter by promotion type: AWARENESS (visibility promotions) or PRICE_OFF (discount promotions).",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        promotionType: z
          .enum(["AWARENESS", "PRICE_OFF"])
          .describe("Type of promotion: AWARENESS (visibility) or PRICE_OFF (discount)."),
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
      }),
    },
    async ({ promotionType, page }) => {
      try {
        const response = await client.getPromotions(promotionType, page);
        const promotions = response.promotions ?? [];

        if (promotions.length === 0) {
          return toTextResult("No promotions found.");
        }

        return toTextResult(
          [
            `Promotions (page ${page}): ${promotions.length} results`,
            ...promotions.map((p) =>
              [
                `  - ${p.promotionId}: ${p.title ?? "Untitled"}`,
                p.startDateTime ? `    Start: ${p.startDateTime}` : null,
                p.endDateTime ? `    End: ${p.endDateTime}` : null,
                p.type ? `    Type: ${p.type}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { promotions } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_promotion",
    {
      title: "Get Promotion",
      description:
        "Get detailed information about a specific promotion including its type, dates, and conditions.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        promotionId: z.string().min(1).describe("The bol.com promotion ID."),
      }),
    },
    async ({ promotionId }) => {
      try {
        const promotion = await client.getPromotion(promotionId);

        return toTextResult(
          [
            `Promotion: ${promotion.promotionId}`,
            promotion.title ? `Title: ${promotion.title}` : null,
            promotion.type ? `Type: ${promotion.type}` : null,
            promotion.startDateTime ? `Start: ${promotion.startDateTime}` : null,
            promotion.endDateTime ? `End: ${promotion.endDateTime}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          promotion as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_promotion_products",
    {
      title: "Get Promotion Products",
      description:
        "Get the list of products participating in a specific promotion.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        promotionId: z.string().min(1).describe("The bol.com promotion ID."),
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
      }),
    },
    async ({ promotionId, page }) => {
      try {
        const response = await client.getPromotionProducts(promotionId, page);
        const products = response.products ?? [];

        if (products.length === 0) {
          return toTextResult("No products found for this promotion.");
        }

        return toTextResult(
          [
            `Promotion ${promotionId} products (page ${page}): ${products.length} results`,
            ...products.map((p) =>
              [
                `  - EAN: ${p.ean ?? "unknown"}`,
                p.title ? `    Title: ${p.title}` : null,
                p.unitPrice !== undefined ? `    Price: ${p.unitPrice}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { products } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
