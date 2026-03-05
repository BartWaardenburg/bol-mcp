import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerRetailerTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_retailer_information",
    {
      title: "Get Retailer Information",
      description:
        "Get retailer information. Provide a retailer ID to look up a specific retailer, or omit it to get your own account information.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        retailerId: z
          .string()
          .optional()
          .describe("The retailer ID. Omit or use 'current' to get your own account information."),
      }),
    },
    async ({ retailerId }) => {
      try {
        const retailer = await client.getRetailerInformation(retailerId);

        return toTextResult(
          [
            `Retailer: ${retailer.displayName ?? retailer.retailerId ?? "Unknown"}`,
            retailer.retailerId ? `ID: ${retailer.retailerId}` : null,
            retailer.companyName ? `Company: ${retailer.companyName}` : null,
            retailer.displayName ? `Display Name: ${retailer.displayName}` : null,
            retailer.countryCode ? `Country: ${retailer.countryCode}` : null,
            retailer.registrationDate ? `Registered: ${retailer.registrationDate}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          retailer as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
