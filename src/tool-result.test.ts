import { describe, it, expect } from "vitest";
import { toTextResult, toErrorResult } from "./tool-result.js";
import { BolApiError } from "./bol-client.js";

describe("toTextResult", () => {
  it("returns text content", () => {
    const result = toTextResult("hello");
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("includes structured content when provided", () => {
    const result = toTextResult("hello", { key: "value" });
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
      structuredContent: { key: "value" },
    });
  });

  it("omits structuredContent when not provided", () => {
    const result = toTextResult("hello");
    expect(result).not.toHaveProperty("structuredContent");
  });
});

describe("toErrorResult", () => {
  it("formats BolApiError with status and details", () => {
    const error = new BolApiError("Not found", 404, { code: "ORDER_NOT_FOUND" });
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Bol.com API error");
    expect(result.content[0].text).toContain("404");
    expect(result.content[0].text).toContain("ORDER_NOT_FOUND");
  });

  it("formats BolApiError without details", () => {
    const error = new BolApiError("Bad request", 400);
    const result = toErrorResult(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("400");
    expect(result.content[0].text).not.toContain("Details:");
  });

  it("formats generic Error", () => {
    const result = toErrorResult(new Error("something broke"));

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("something broke");
  });

  it("formats non-Error values", () => {
    const result = toErrorResult("string error");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("string error");
  });

  it("includes rate limit recovery suggestion for 429", () => {
    const error = new BolApiError("Rate limit exceeded", 429);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("Rate limit exceeded");
  });

  it("includes order not found recovery suggestion for 404 with order context", () => {
    const error = new BolApiError("Order not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("list_orders");
  });

  it("includes offer not found recovery suggestion for 404 with offer context", () => {
    const error = new BolApiError("Offer not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("offerId");
  });

  it("includes shipment not found recovery suggestion for 404 with shipment context", () => {
    const error = new BolApiError("Shipment not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("list_shipments");
  });

  it("includes return not found recovery suggestion for 404 with return context", () => {
    const error = new BolApiError("Return not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("list_returns");
  });

  it("includes invoice not found recovery suggestion for 404 with invoice context", () => {
    const error = new BolApiError("Invoice not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("list_invoices");
  });

  it("includes generic 404 recovery suggestion for unspecific resource", () => {
    const error = new BolApiError("Resource not found", 404);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("Verify the identifier");
  });

  it("includes EAN validation recovery suggestion for 400 with EAN context", () => {
    const error = new BolApiError("Bad request", 400, "Invalid EAN provided");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("13-digit");
  });

  it("includes duplicate resource recovery suggestion for 400 with duplicate context", () => {
    const error = new BolApiError("Bad request", 400, "Resource already exists");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("update tool");
  });

  it("includes duplicate recovery for 400 with 'duplicate' in details", () => {
    const error = new BolApiError("Bad request", 400, "Duplicate entry detected");
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("update tool");
  });

  it("includes generic 400 recovery suggestion for unspecific errors", () => {
    const error = new BolApiError("Bad request", 400);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("required parameters");
  });

  it("includes auth recovery suggestion for 401", () => {
    const error = new BolApiError("Unauthorized", 401);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("BOL_CLIENT_ID");
  });

  it("includes auth recovery suggestion for 403", () => {
    const error = new BolApiError("Forbidden", 403);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("BOL_CLIENT_SECRET");
  });

  it("includes server error recovery suggestion for 500", () => {
    const error = new BolApiError("Internal server error", 500);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("temporary issue");
  });

  it("includes server error recovery suggestion for 502", () => {
    const error = new BolApiError("Bad gateway", 502);
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Recovery:");
    expect(result.content[0].text).toContain("temporary issue");
  });

  it("returns no recovery suggestion for unrecognized status codes", () => {
    const error = new BolApiError("I'm a teapot", 418);
    const result = toErrorResult(error);

    expect(result.content[0].text).not.toContain("Recovery:");
  });

  it("includes details as JSON when details is an object", () => {
    const error = new BolApiError("Error", 400, { violations: [{ reason: "invalid" }] });
    const result = toErrorResult(error);

    expect(result.content[0].text).toContain("Details:");
    expect(result.content[0].text).toContain("violations");
  });
});
