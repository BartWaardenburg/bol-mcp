import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerInventoryTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_inventory",
    {
      title: "Get Inventory",
      description:
        "Get LVB/FBB inventory list from bol.com. Returns inventory items with EAN, title, regular stock, and graded stock. " +
        "Filter by quantity range, stock level, state, or search by EAN/product title.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        quantity: z
          .string()
          .optional()
          .describe("Filter by quantity range, e.g. \"0-10\", \"10-20\"."),
        stock: z
          .enum(["SUFFICIENT", "INSUFFICIENT"])
          .optional()
          .describe("Filter by stock level: SUFFICIENT or INSUFFICIENT."),
        state: z
          .enum(["REGULAR", "GRADED"])
          .optional()
          .describe("Filter by inventory state: REGULAR or GRADED."),
        query: z
          .string()
          .optional()
          .describe("Filter by EAN or product title."),
      }),
    },
    async ({ page, quantity, stock, state, query }) => {
      try {
        const response = await client.getInventory(page, quantity, stock, state, query);
        const inventory = response.inventory ?? [];

        if (inventory.length === 0) {
          return toTextResult("No inventory items found.");
        }

        return toTextResult(
          [
            `Inventory (page ${page}): ${inventory.length} items`,
            ...inventory.map((item) =>
              [
                `  - EAN: ${item.ean ?? "unknown"}`,
                `    Title: ${item.title ?? "unknown"}`,
                `    Regular stock: ${item.regularStock ?? 0}`,
                `    Graded stock: ${item.gradedStock ?? 0}`,
              ].join("\n"),
            ),
          ].join("\n"),
          { inventory } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
