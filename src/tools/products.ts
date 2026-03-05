import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerProductTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_product_categories",
    {
      title: "Get Product Categories",
      description:
        "Get the list of product categories available on bol.com. " +
        "Returns categories with their IDs and names.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        language: z
          .enum(["nl", "nl-NL", "nl-BE", "fr-BE"])
          .optional()
          .describe("Language for the category names."),
      }),
    },
    async ({ language }) => {
      try {
        const response = await client.getProductCategories(language);
        const cats = response.categories ?? [];

        return toTextResult(
          [
            `Product categories (${cats.length}):`,
            ...cats.map((c) => `  - ${c.categoryId}: ${c.categoryName ?? "unknown"}`),
          ].join("\n"),
          response as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_list",
    {
      title: "Get Product List",
      description:
        "Search or browse products on bol.com by category or search term. " +
        "Returns a list of products with EAN and title.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        countryCode: z.enum(["NL", "BE"]).optional().describe("Country code."),
        categoryId: z.string().optional().describe("Category ID to browse products in."),
        searchTerm: z.string().optional().describe("Search term to find products."),
        page: z.number().int().optional().default(1).describe("Page number (default 1)."),
        sort: z
          .enum(["RELEVANCE", "POPULARITY", "PRICE_ASC", "PRICE_DESC", "RELEASE_DATE", "RATING", "WISHLIST"])
          .optional()
          .describe("Sort order for the product list."),
        filterRanges: z
          .array(
            z.object({
              rangeId: z.string().describe("The filter range ID."),
              min: z.number().describe("Minimum value."),
              max: z.number().describe("Maximum value."),
            }),
          )
          .optional()
          .describe("Filter ranges to apply."),
        filterValues: z
          .array(
            z.object({
              filterValueId: z.string().describe("The filter value ID."),
            }),
          )
          .optional()
          .describe("Filter values to apply."),
        language: z
          .enum(["nl", "nl-NL", "nl-BE", "fr-BE"])
          .optional()
          .describe("Language for the response (Accept-Language header)."),
      }),
    },
    async ({ countryCode, categoryId, searchTerm, page, sort, filterRanges, filterValues, language }) => {
      try {
        const result = await client.getProductList({ countryCode, categoryId, searchTerm, page, sort, filterRanges, filterValues, language });

        const products = result.products ?? [];
        const lines = products.map(
          (p) => `  - ${p.title ?? "unknown"}`,
        );

        return toTextResult(
          [
            `Products (page ${page}, ${products.length} results):`,
            ...lines,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_list_filters",
    {
      title: "Get Product List Filters",
      description:
        "Get the available filters for browsing or searching products on bol.com.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        countryCode: z.enum(["NL", "BE"]).optional().describe("Country code."),
        searchTerm: z.string().optional().describe("Search term to get filters for."),
        categoryId: z.string().optional().describe("Category ID to get filters for."),
        language: z.string().optional().describe("Language for filter labels."),
      }),
    },
    async ({ countryCode, searchTerm, categoryId, language }) => {
      try {
        const filters = await client.getProductListFilters(countryCode, searchTerm, categoryId, language);

        return toTextResult(
          "Product list filters retrieved successfully.",
          filters as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_assets",
    {
      title: "Get Product Assets",
      description:
        "Get product assets (images) for a product by EAN. " +
        "Optionally filter by usage type.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().min(8).max(13).describe("EAN (European Article Number) barcode of the product."),
        usage: z
          .enum(["PRIMARY", "ADDITIONAL", "IMAGE"])
          .optional()
          .describe("Filter assets by usage type."),
      }),
    },
    async ({ ean, usage }) => {
      try {
        const assets = await client.getProductAssets(ean, usage);

        return toTextResult(
          `Product assets for EAN ${ean} retrieved successfully.`,
          assets as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_competing_offers",
    {
      title: "Get Competing Offers",
      description:
        "Get competing offers for a product by EAN. " +
        "Shows offer details including pricing, condition, and seller information.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().describe("EAN (European Article Number) barcode of the product."),
        page: z.number().int().optional().default(1).describe("Page number (default 1)."),
        countryCode: z.enum(["NL", "BE"]).optional().describe("Country code."),
        bestOfferOnly: z.boolean().optional().describe("Only return the best offer."),
        condition: z
          .enum(["ALL", "BAD", "MODERATE", "REASONABLE", "GOOD", "AS_NEW", "NEW", "REFURBISHED_A", "REFURBISHED_B", "REFURBISHED_C"])
          .optional()
          .describe("Filter by product condition."),
        includeRefurbishedConditions: z
          .boolean()
          .optional()
          .describe("Whether to include refurbished conditions in the results."),
      }),
    },
    async ({ ean, page, countryCode, bestOfferOnly, condition, includeRefurbishedConditions }) => {
      try {
        const result = await client.getCompetingOffers(ean, page, countryCode, bestOfferOnly, condition, includeRefurbishedConditions);

        const offers = result.offers ?? [];
        const lines = offers.map(
          (o) =>
            `  - Offer ${o.offerId ?? "?"}: ${o.price ?? "N/A"} (${o.condition ?? "N/A"}, ${o.fulfilmentMethod ?? "?"})${o.bestOffer ? " [BEST]" : ""}`,
        );

        return toTextResult(
          [
            `Competing offers for EAN ${ean} (page ${page}, ${offers.length} offers):`,
            ...lines,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_placement",
    {
      title: "Get Product Placement",
      description:
        "Get product placement information for a product by EAN.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().describe("EAN (European Article Number) barcode of the product."),
        countryCode: z.enum(["NL", "BE"]).optional().describe("Country code."),
        language: z.string().optional().describe("Language for the response."),
      }),
    },
    async ({ ean, countryCode, language }) => {
      try {
        const placement = await client.getProductPlacement(ean, countryCode, language);

        return toTextResult(
          `Product placement for EAN ${ean} retrieved successfully.`,
          placement as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_price_star_boundaries",
    {
      title: "Get Price Star Boundaries",
      description:
        "Get the price star boundaries for a product by EAN. " +
        "Shows the price ranges that correspond to different star ratings.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().describe("EAN (European Article Number) barcode of the product."),
      }),
    },
    async ({ ean }) => {
      try {
        const boundaries = await client.getPriceStarBoundaries(ean);

        return toTextResult(
          `Price star boundaries for EAN ${ean} retrieved successfully.`,
          boundaries as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_ids",
    {
      title: "Get Product IDs",
      description:
        "Get the product identifiers for a product by EAN. " +
        "Returns various IDs associated with the product.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().describe("EAN (European Article Number) barcode of the product."),
      }),
    },
    async ({ ean }) => {
      try {
        const ids = await client.getProductIds(ean);

        return toTextResult(
          `Product IDs for EAN ${ean} retrieved successfully.`,
          ids as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_ratings",
    {
      title: "Get Product Ratings",
      description:
        "Get ratings and reviews summary for a product by EAN. " +
        "Shows the average rating and total number of reviews.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().describe("EAN (European Article Number) barcode of the product."),
      }),
    },
    async ({ ean }) => {
      try {
        const ratings = await client.getProductRatings(ean);

        const ratingsList = ratings.ratings ?? [];

        return toTextResult(
          [
            `Product ratings for EAN ${ean}:`,
            ...ratingsList.map((r) => `  ${r.rating} stars: ${r.count ?? 0} reviews`),
          ].join("\n"),
          ratings as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
