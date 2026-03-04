import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerInvoiceTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_invoices",
    {
      title: "List Invoices",
      description:
        "List invoices from bol.com. Optionally filter by date range using period start and end dates (format: YYYY-MM-DD). " +
        "The date range must not exceed 32 days.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        periodStartDate: z
          .string()
          .optional()
          .describe("Start date for the invoice period (YYYY-MM-DD)."),
        periodEndDate: z
          .string()
          .optional()
          .describe("End date for the invoice period (YYYY-MM-DD)."),
      }),
    },
    async ({ periodStartDate, periodEndDate }) => {
      try {
        const response = await client.getInvoices(periodStartDate, periodEndDate);
        const invoices = response.invoiceListItems ?? [];

        if (invoices.length === 0) {
          return toTextResult("No invoices found for the specified period.");
        }

        return toTextResult(
          [
            `Invoices: ${invoices.length} results`,
            response.period ? `Period: ${response.period}` : null,
            ...invoices.map((inv) =>
              [
                `  - Invoice ${inv.invoiceId}`,
                inv.invoiceType ? `    Type: ${inv.invoiceType}` : null,
                inv.issueDate ? `    Issued: ${inv.issueDate}` : null,
                inv.invoicePeriod
                  ? `    Period: ${inv.invoicePeriod.startDate} to ${inv.invoicePeriod.endDate}`
                  : null,
                inv.legalMonetaryTotal?.payableAmount !== undefined
                  ? `    Payable: ${inv.legalMonetaryTotal.payableAmount}`
                  : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ]
            .filter(Boolean)
            .join("\n"),
          { invoices } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get Invoice Details",
      description: "Get detailed information about a specific invoice.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        invoiceId: z.string().min(1).describe("The bol.com invoice ID."),
      }),
    },
    async ({ invoiceId }) => {
      try {
        const invoice = await client.getInvoice(invoiceId);

        return toTextResult(
          `Invoice ${invoiceId} details retrieved.`,
          invoice as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
