import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerInsightTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_offer_insights",
    {
      title: "Get Offer Insights",
      description:
        "Get offer visit and buy box insights for a specific offer. " +
        "Returns data like product visits or buy box percentage over the specified time period.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID."),
        period: z.enum(["DAY", "WEEK", "MONTH"]).describe("The time period granularity."),
        numberOfPeriods: z.number().int().min(1).describe("Number of periods to retrieve."),
        name: z
          .enum(["PRODUCT_VISITS", "BUY_BOX_PERCENTAGE"])
          .describe("The type of insight to retrieve."),
      }),
    },
    async ({ offerId, period, numberOfPeriods, name }) => {
      try {
        const insights = await client.getOfferInsights(offerId, period, numberOfPeriods, name);

        return toTextResult(
          [
            `Offer Insights for ${offerId}:`,
            `  Metric: ${name}`,
            `  Period: ${numberOfPeriods} x ${period}`,
            `  Data: ${JSON.stringify(insights, null, 2)}`,
          ].join("\n"),
          insights as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_performance_indicators",
    {
      title: "Get Performance Indicators",
      description:
        "Get retailer performance indicators for a specific week. " +
        "Returns scores and details for metrics like cancellations, fulfilment, phone availability, etc.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        name: z
          .enum([
            "CANCELLATIONS",
            "FULFILMENT",
            "PHONE_AVAILABILITY",
            "RESPONSE_TIME",
            "CASE_ITEM_RATIO",
            "TRACK_AND_TRACE",
            "RETURNS",
            "REVIEWS",
          ])
          .describe("The performance indicator to retrieve."),
        year: z.string().min(1).describe("The year (e.g. '2024')."),
        week: z.string().min(1).describe("The week number (e.g. '10')."),
      }),
    },
    async ({ name, year, week }) => {
      try {
        const indicators = await client.getPerformanceIndicators(name, year, week);

        return toTextResult(
          [
            `Performance Indicator: ${name}`,
            `  Period: week ${week}, ${year}`,
            `  Data: ${JSON.stringify(indicators, null, 2)}`,
          ].join("\n"),
          indicators as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_product_ranks",
    {
      title: "Get Product Ranks",
      description:
        "Get product search and browse ranking data for a specific EAN on a given date. " +
        "Shows how a product ranks in search results and category browsing.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().min(1).describe("The EAN of the product."),
        date: z.string().min(1).describe("The date in YYYY-MM-DD format."),
        type: z
          .enum(["SEARCH", "BROWSE"])
          .optional()
          .describe("Filter by ranking type: SEARCH or BROWSE."),
        page: z.number().int().default(1).describe("Page number for pagination."),
        language: z.string().optional().describe("Language filter for results."),
      }),
    },
    async ({ ean, date, type, page, language }) => {
      try {
        const ranks = await client.getProductRanks(ean, date, type, page, language);

        return toTextResult(
          [
            `Product Ranks for EAN ${ean}:`,
            `  Date: ${date}`,
            type ? `  Type: ${type}` : null,
            `  Page: ${page}`,
            `  Data: ${JSON.stringify(ranks, null, 2)}`,
          ]
            .filter(Boolean)
            .join("\n"),
          ranks as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_sales_forecast",
    {
      title: "Get Sales Forecast",
      description:
        "Get sales forecast for a specific offer. " +
        "Returns predicted sales volume for the specified number of weeks ahead (1-12).",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        offerId: z.string().min(1).describe("The bol.com offer ID."),
        weeksAhead: z
          .number()
          .int()
          .min(1)
          .max(12)
          .describe("Number of weeks to forecast (1-12)."),
      }),
    },
    async ({ offerId, weeksAhead }) => {
      try {
        const forecast = await client.getSalesForecast(offerId, weeksAhead);

        return toTextResult(
          [
            `Sales Forecast for offer ${offerId}:`,
            `  Weeks ahead: ${weeksAhead}`,
            `  Data: ${JSON.stringify(forecast, null, 2)}`,
          ].join("\n"),
          forecast as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_search_terms",
    {
      title: "Get Search Terms",
      description:
        "Get search term volume data from bol.com. " +
        "Returns how often a search term is used over the specified time period, optionally including related search terms.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        searchTerm: z.string().min(1).describe("The search term to look up."),
        period: z.enum(["DAY", "WEEK", "MONTH"]).describe("The time period granularity."),
        numberOfPeriods: z.number().int().min(1).describe("Number of periods to retrieve."),
        relatedSearchTerms: z
          .boolean()
          .optional()
          .describe("Whether to include related search terms in the response."),
      }),
    },
    async ({ searchTerm, period, numberOfPeriods, relatedSearchTerms }) => {
      try {
        const terms = await client.getSearchTerms(searchTerm, period, numberOfPeriods, relatedSearchTerms);

        return toTextResult(
          [
            `Search Terms for "${searchTerm}":`,
            `  Period: ${numberOfPeriods} x ${period}`,
            relatedSearchTerms ? "  Including related search terms" : null,
            `  Data: ${JSON.stringify(terms, null, 2)}`,
          ]
            .filter(Boolean)
            .join("\n"),
          terms as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
