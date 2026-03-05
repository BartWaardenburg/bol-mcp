import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerProductContentTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_catalog_product",
    {
      title: "Get Catalog Product",
      description:
        "Get catalog product details by EAN, including product attributes, titles, and other catalog information.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        ean: z.string().min(8).max(13).describe("EAN (European Article Number) barcode of the product."),
        language: z
          .enum(["nl", "nl-BE", "fr", "fr-BE"])
          .optional()
          .describe("Language for product content. Defaults to nl."),
      }),
    },
    async ({ ean, language }) => {
      try {
        const product = await client.getCatalogProduct(ean, language);

        return toTextResult(
          [
            `Catalog Product: ${ean}`,
            product.title ? `Title: ${product.title}` : null,
            product.brand ? `Brand: ${product.brand}` : null,
            product.category ? `Category: ${product.category}` : null,
            product.description ? `Description: ${product.description}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          product as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_product_content",
    {
      title: "Create Product Content",
      description:
        "Create or update product content for a given EAN. Provide product attributes such as title, description, brand, etc. " +
        "Returns a process status — the content is created asynchronously. Use get_process_status to check completion.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        language: z.string().min(1).describe("Language for the product content (e.g. 'nl', 'nl-BE', 'fr-BE')."),
        attributes: z
          .array(
            z.object({
              id: z.string().min(1).describe("The attribute ID."),
              values: z
                .array(
                  z.object({
                    value: z.string().describe("The attribute value."),
                    unitId: z.string().optional().describe("Optional unit ID."),
                  }),
                )
                .min(1)
                .describe("Attribute values."),
            }),
          )
          .min(1)
          .describe("Product attributes with id and values."),
        assets: z
          .array(
            z.object({
              url: z.string().describe("URL of the asset."),
              labels: z.array(z.string()).describe("Labels for the asset."),
            }),
          )
          .optional()
          .describe("Product assets (images)."),
      }),
    },
    async ({ language, attributes, assets }) => {
      try {
        const result = await client.createProductContent({
          language,
          attributes,
          ...(assets !== undefined ? { assets } : {}),
        });

        return toTextResult(
          [
            `Product content creation initiated`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            "Use get_process_status to check when the content is created.",
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
    "get_upload_report",
    {
      title: "Get Upload Report",
      description:
        "Get a product content upload report by upload ID. Shows the status and any validation errors for a content upload.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        uploadId: z.string().min(1).describe("The upload ID from a product content creation."),
      }),
    },
    async ({ uploadId }) => {
      try {
        const report = await client.getUploadReport(uploadId);
        const errors = Array.isArray(report.errors) ? report.errors : [];

        return toTextResult(
          [
            `Upload Report: ${uploadId}`,
            report.status ? `Status: ${report.status}` : null,
            report.language ? `Language: ${report.language}` : null,
            errors.length > 0
              ? `Errors:\n${errors.map((e: Record<string, unknown>) => `  - ${e.description ?? e.message ?? JSON.stringify(e)}`).join("\n")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          report as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_chunk_recommendations",
    {
      title: "Get Product Content Recommendations",
      description:
        "Get product content recommendations (chunk recommendations) for a given EAN. Provides suggestions for improving product content.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        attributes: z
          .array(
            z.object({
              id: z.string().min(1).describe("The attribute ID."),
              values: z
                .array(
                  z.object({
                    value: z.string().describe("The attribute value."),
                  }),
                )
                .min(1)
                .describe("Attribute values."),
            }),
          )
          .min(1)
          .describe("Product attributes to get chunk recommendations for."),
      }),
    },
    async ({ attributes }) => {
      try {
        const recommendations = await client.getChunkRecommendations({
          productContents: [{ attributes }],
        });
        const recs = Array.isArray(recommendations.recommendations) ? recommendations.recommendations : [];

        return toTextResult(
          [
            "Content Chunk Recommendations:",
            recs.length > 0
              ? recs
                  .map((r: Record<string, unknown>) => {
                    const predictions = Array.isArray(r.predictions) ? r.predictions : [];
                    return predictions
                      .map((p: Record<string, unknown>) => `  - Chunk ${p.chunkId}: ${p.probability}`)
                      .join("\n");
                  })
                  .join("\n")
              : "No recommendations available.",
          ].join("\n"),
          recommendations as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
