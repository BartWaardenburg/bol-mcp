import { BolApiError } from "./bol-client.js";

export const toTextResult = (
  text: string,
  structuredContent?: Record<string, unknown>,
) => ({
  content: [{ type: "text" as const, text }],
  ...(structuredContent ? { structuredContent } : {}),
});

const getRecoverySuggestion = (status: number, message: string, details: unknown): string | null => {
  if (status === 429) {
    return "Rate limit exceeded. The bol.com API has rate limits per endpoint. Wait a moment and retry, or reduce the frequency of API calls.";
  }

  if (status === 404) {
    const lower = message.toLowerCase();
    if (lower.includes("order")) {
      return "Order not found. Verify the orderId is correct. Use list_orders to see recent orders.";
    }
    if (lower.includes("offer")) {
      return "Offer not found. Verify the offerId is correct. The offer may have been deleted.";
    }
    if (lower.includes("shipment")) {
      return "Shipment not found. Verify the shipmentId is correct. Use list_shipments to see existing shipments.";
    }
    if (lower.includes("return")) {
      return "Return not found. Verify the returnId is correct. Use list_returns to see existing returns.";
    }
    if (lower.includes("invoice")) {
      return "Invoice not found. Verify the invoiceId is correct. Use list_invoices to see available invoices.";
    }
    return "Resource not found. Verify the identifier is correct and the resource exists in your account.";
  }

  if (status === 400) {
    const detailStr = typeof details === "string" ? details : JSON.stringify(details ?? "");
    const lower = detailStr.toLowerCase();
    if (lower.includes("ean")) {
      return "Invalid EAN. Ensure the EAN is a valid 13-digit barcode number.";
    }
    if (lower.includes("already exists") || lower.includes("duplicate")) {
      return "This resource already exists. Use the corresponding update tool instead of create.";
    }
    return "Invalid request. Check that all required parameters are provided and in the correct format.";
  }

  if (status === 401 || status === 403) {
    return "Authentication failed. Verify that BOL_CLIENT_ID and BOL_CLIENT_SECRET environment variables are set correctly and the API credentials have not expired.";
  }

  if (status >= 500) {
    return "Bol.com API server error. This is a temporary issue on bol.com's end. Wait a moment and retry the operation.";
  }

  return null;
};

export const toErrorResult = (error: unknown) => {
  if (error instanceof BolApiError) {
    const suggestion = getRecoverySuggestion(error.status, error.message, error.details);

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Bol.com API error: ${error.message}`,
            `Status: ${error.status}`,
            error.details ? `Details: ${JSON.stringify(error.details, null, 2)}` : "",
            suggestion ? `\nRecovery: ${suggestion}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
    isError: true,
  };
};
