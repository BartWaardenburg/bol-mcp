import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerReturnTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_returns",
    {
      title: "List Returns",
      description:
        "List returns from bol.com. Filter by handled status and fulfilment method. " +
        "Unhandled returns require action — use handle_return to process them.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
        handled: z.boolean().optional().describe("Filter by handled status. true = handled, false = unhandled."),
        fulfilmentMethod: z
          .enum(["FBR", "FBB"])
          .optional()
          .describe("Filter by fulfilment method."),
      }),
    },
    async ({ page, handled, fulfilmentMethod }) => {
      try {
        const response = await client.getReturns(page, handled, fulfilmentMethod);
        const returns = response.returns ?? [];

        if (returns.length === 0) {
          return toTextResult("No returns found.");
        }

        return toTextResult(
          [
            `Returns (page ${page}): ${returns.length} results`,
            ...returns.map((r) =>
              [
                `  - Return ${r.returnId}`,
                r.registrationDateTime ? `    Registered: ${r.registrationDateTime}` : null,
                r.fulfilmentMethod ? `    Fulfilment: ${r.fulfilmentMethod}` : null,
                `    Items: ${r.returnItems.length}`,
                ...r.returnItems.map((item) =>
                  [
                    `      ${item.ean} - ${item.title ?? "unknown"} x${item.expectedQuantity}`,
                    item.returnReason ? `        Reason: ${item.returnReason.mainReason}${item.returnReason.detailedReason ? ` - ${item.returnReason.detailedReason}` : ""}` : null,
                    item.handled !== undefined ? `        Handled: ${item.handled}` : null,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                ),
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { returns } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_return",
    {
      title: "Get Return Details",
      description:
        "Get detailed information about a specific return including return items, reasons, tracking, and processing results.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        returnId: z.string().min(1).describe("The bol.com return ID."),
      }),
    },
    async ({ returnId }) => {
      try {
        const ret = await client.getReturn(returnId);

        return toTextResult(
          [
            `Return: ${ret.returnId}`,
            ret.registrationDateTime ? `Registered: ${ret.registrationDateTime}` : null,
            ret.fulfilmentMethod ? `Fulfilment: ${ret.fulfilmentMethod}` : null,
            `Items (${ret.returnItems.length}):`,
            ...ret.returnItems.map((item) =>
              [
                `  - ${item.ean}: ${item.title ?? "unknown"} x${item.expectedQuantity}`,
                `    Order: ${item.orderId} / Item: ${item.orderItemId}`,
                item.returnReason
                  ? `    Reason: ${item.returnReason.mainReason}${item.returnReason.detailedReason ? ` - ${item.returnReason.detailedReason}` : ""}${item.returnReason.customerComments ? ` ("${item.returnReason.customerComments}")` : ""}`
                  : null,
                item.trackAndTrace ? `    Tracking: ${item.trackAndTrace}` : null,
                item.handled !== undefined ? `    Handled: ${item.handled}` : null,
                item.processingResults
                  ? item.processingResults.map((pr) => `    Processing: ${pr.processingResult} / ${pr.handlingResult} (qty: ${pr.quantity})`).join("\n")
                  : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ]
            .filter(Boolean)
            .join("\n"),
          ret as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "handle_return",
    {
      title: "Handle Return",
      description:
        "Handle/process a return item. Set the handling result and quantity returned. " +
        "Valid handling results: RETURN_RECEIVED, EXCHANGE_PRODUCT, RETURN_DOES_NOT_MEET_CONDITIONS, REPAIR_PRODUCT, CUSTOMER_KEEPS_PRODUCT_PAID, STILL_APPROVED. " +
        "Returns a process status — the return is handled asynchronously. " +
        "Always review the return details with get_return before handling.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        returnId: z.string().min(1).describe("The bol.com return ID."),
        handlingResult: z
          .enum([
            "RETURN_RECEIVED",
            "EXCHANGE_PRODUCT",
            "RETURN_DOES_NOT_MEET_CONDITIONS",
            "REPAIR_PRODUCT",
            "CUSTOMER_KEEPS_PRODUCT_PAID",
            "STILL_APPROVED",
          ])
          .describe("How the return was handled."),
        quantityReturned: z.number().int().min(1).describe("Number of items returned."),
      }),
    },
    async ({ returnId, handlingResult, quantityReturned }) => {
      try {
        const result = await client.handleReturn(returnId, {
          handlingResult,
          quantityReturned,
        });

        return toTextResult(
          [
            `Return ${returnId} handling initiated: ${handlingResult} (${quantityReturned} items)`,
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
