import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BolClient, BolApiError } from "./bol-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const tokenResponse = (expiresIn = 300): Response =>
  new Response(
    JSON.stringify({
      access_token: "test-token",
      token_type: "bearer",
      expires_in: expiresIn,
      scope: "RETAILER",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/vnd.retailer.v10+json" },
  });

const emptyResponse = (status = 204): Response =>
  new Response(null, { status });

const errorResponse = (status: number, body?: unknown): Response =>
  new Response(body ? JSON.stringify(body) : "error", {
    status,
    statusText: "Error",
    headers: body ? { "content-type": "application/json" } : {},
  });

describe("BolClient", () => {
  let client: BolClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new BolClient("test-id", "test-secret", "https://api.test.com/retailer", undefined, { maxRetries: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication", () => {
    it("sends Basic auth to token endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      await client.getOrders();

      const [tokenUrl, tokenInit] = mockFetch.mock.calls[0];
      expect(tokenUrl).toBe("https://login.bol.com/token");
      expect(tokenInit.method).toBe("POST");
      expect(tokenInit.body).toBe("grant_type=client_credentials");

      const headers = tokenInit.headers as Record<string, string>;
      const expectedCredentials = Buffer.from("test-id:test-secret").toString("base64");
      expect(headers["Authorization"]).toBe(`Basic ${expectedCredentials}`);
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });

    it("reuses token within expiry window", async () => {
      // Use a client with caching disabled so second call hits the API
      const noCacheClient = new BolClient("test-id", "test-secret", "https://api.test.com/retailer", 0, { maxRetries: 0 });

      mockFetch
        .mockResolvedValueOnce(tokenResponse(300))
        .mockResolvedValueOnce(jsonResponse({ orders: [] }))
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      await noCacheClient.getOrders();
      await noCacheClient.getOrders();

      // Only one token call, two API calls (no re-auth)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[0][0]).toBe("https://login.bol.com/token");
      expect(mockFetch.mock.calls[1][0]).toContain("/orders");
      expect(mockFetch.mock.calls[2][0]).toContain("/orders");
    });

    it("throws BolApiError when authentication fails", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, { error: "invalid_client" }));

      await expect(client.getOrders()).rejects.toThrow(BolApiError);
    });
  });

  describe("request building", () => {
    it("sends Bearer auth and Accept header on API requests", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      await client.getOrders();

      const [, init] = mockFetch.mock.calls[1];
      const headers = init.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
      expect(headers.get("Accept")).toBe("application/vnd.retailer.v10+json");
    });

    it("sets Content-Type on requests with body", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.createOffer({
        ean: "1234567890123",
        condition: { name: "NEW" },
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 10 }] },
        stock: { amount: 5, managedByRetailer: true },
        fulfilment: { method: "FBR" },
      });

      const [, init] = mockFetch.mock.calls[1];
      const headers = init.headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/vnd.retailer.v10+json");
    });

    it("strips trailing slash from baseUrl", () => {
      const c = new BolClient("id", "secret", "https://api.test.com/retailer/", undefined, { maxRetries: 0 });
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      c.getOrders();

      const [url] = mockFetch.mock.calls[1] ?? [""];
      expect(url).not.toContain("retailer//");
    });
  });

  describe("response handling", () => {
    it("returns parsed JSON for successful responses", async () => {
      const data = { orders: [{ orderId: "123", orderItems: [] }] };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(data));

      const result = await client.getOrders();
      expect(result).toEqual(data);
    });

    it("returns null for 204 responses", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(emptyResponse(204));

      const result = await client.deleteOffer("offer-123");
      expect(result).toBeNull();
    });

    it("handles 202 accepted responses", async () => {
      const data = { processStatusId: "ps-1", status: "PENDING" };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(data, 202));

      const result = await client.createShipment({
        orderItems: [{ orderItemId: "item-1" }],
      });
      expect(result).toEqual(data);
    });

    it("throws BolApiError for error responses", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(errorResponse(404, { detail: "Not found" }));

      await expect(client.getOrder("invalid")).rejects.toThrow(BolApiError);
      try {
        mockFetch
          .mockResolvedValueOnce(jsonResponse({ orders: [] })); // reuse token
        await client.getOrder("invalid");
      } catch (e) {
        expect(e).toBeInstanceOf(BolApiError);
        expect((e as BolApiError).status).toBe(404);
      }
    });
  });

  describe("retry on 429", () => {
    it("retries on 429 and succeeds", async () => {
      const retryClient = new BolClient("test-id", "test-secret", "https://api.test.com/retailer", undefined, { maxRetries: 2 });

      const rateLimitResponse = new Response("rate limited", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "0" },
      });

      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      const result = await retryClient.getOrders();
      expect(result).toEqual({ orders: [] });
      // token + 429 + success
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("throws after exhausting retries on 429", async () => {
      const retryClient = new BolClient("test-id", "test-secret", "https://api.test.com/retailer", undefined, { maxRetries: 1 });

      const makeRateLimitResponse = () =>
        new Response("rate limited", {
          status: 429,
          statusText: "Too Many Requests",
          headers: { "retry-after": "0" },
        });

      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(makeRateLimitResponse())
        .mockResolvedValueOnce(makeRateLimitResponse());

      await expect(retryClient.getOrders()).rejects.toThrow(BolApiError);
    });
  });

  describe("caching", () => {
    it("returns cached response for identical requests", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ orders: [{ orderId: "1", orderItems: [] }] }));

      const result1 = await client.getOrders();
      const result2 = await client.getOrders();

      expect(result1).toEqual(result2);
      // token + one API call (second is cached)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("skips cache when caching is disabled (cacheTtlMs=0)", async () => {
      const noCacheClient = new BolClient("test-id", "test-secret", "https://api.test.com/retailer", 0, { maxRetries: 0 });

      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ orders: [] }))
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      await noCacheClient.getOrders();
      await noCacheClient.getOrders();

      // token + two API calls (no caching)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("invalidates cache on write operations", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ offerId: "offer-1", ean: "123", pricing: {}, stock: { amount: 5, managedByRetailer: true }, fulfilment: { method: "FBR" }, onHoldByRetailer: false }))
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "ps-1", status: "PENDING" }))
        .mockResolvedValueOnce(jsonResponse({ offerId: "offer-1", ean: "123", pricing: {}, stock: { amount: 10, managedByRetailer: true }, fulfilment: { method: "FBR" }, onHoldByRetailer: false }));

      await client.getOffer("offer-1");
      await client.updateOfferStock("offer-1", { amount: 10, managedByRetailer: true });
      await client.getOffer("offer-1");

      // token + getOffer + updateOfferStock + getOffer (cache invalidated)
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe("getOrders", () => {
    it("builds query params for page, fulfilmentMethod, and status", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ orders: [] }));

      await client.getOrders(2, "FBR", "OPEN");

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("page=2");
      expect(url).toContain("fulfilment-method=FBR");
      expect(url).toContain("status=OPEN");
    });
  });

  describe("getOrder", () => {
    it("fetches order by ID", async () => {
      const order = { orderId: "123", orderItems: [] };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(order));

      const result = await client.getOrder("123");
      expect(result).toEqual(order);
      expect(mockFetch.mock.calls[1][0]).toContain("/orders/123");
    });
  });

  describe("getOffer", () => {
    it("fetches offer by ID", async () => {
      const offer = { offerId: "abc", ean: "123" };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(offer));

      const result = await client.getOffer("abc");
      expect(result).toEqual(offer);
      expect(mockFetch.mock.calls[1][0]).toContain("/offers/abc");
    });
  });

  describe("createOffer", () => {
    it("sends POST with offer data", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.createOffer({
        ean: "1234567890123",
        condition: { name: "NEW" },
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 10 }] },
        stock: { amount: 5, managedByRetailer: true },
        fulfilment: { method: "FBR" },
      });

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/offers");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toHaveProperty("ean", "1234567890123");
    });
  });

  describe("updateOffer", () => {
    it("sends PUT with update data", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.updateOffer("offer-1", { reference: "ref-new" });

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/offers/offer-1");
      expect(init.method).toBe("PUT");
    });
  });

  describe("deleteOffer", () => {
    it("sends DELETE for offer", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.deleteOffer("offer-1");

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/offers/offer-1");
      expect(init.method).toBe("DELETE");
    });
  });

  describe("updateOfferPrice", () => {
    it("sends PUT to price endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.updateOfferPrice("offer-1", { pricing: { bundlePrices: [{ quantity: 1, unitPrice: 15 }] } });

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/offers/offer-1/price");
      expect(init.method).toBe("PUT");
    });
  });

  describe("updateOfferStock", () => {
    it("sends PUT to stock endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.updateOfferStock("offer-1", { amount: 20, managedByRetailer: true });

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/offers/offer-1/stock");
      expect(init.method).toBe("PUT");
    });
  });

  describe("getShipments", () => {
    it("builds query params", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ shipments: [] }));

      await client.getShipments(1, "order-1", "FBR");

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("order-id=order-1");
      expect(url).toContain("fulfilment-method=FBR");
    });
  });

  describe("getShipment", () => {
    it("fetches shipment by ID", async () => {
      const shipment = { shipmentId: "ship-1" };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(shipment));

      const result = await client.getShipment("ship-1");
      expect(result).toEqual(shipment);
    });
  });

  describe("createShipment", () => {
    it("sends POST with shipment data", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.createShipment({
        orderItems: [{ orderItemId: "item-1" }],
        transport: { transporterCode: "TNT", trackAndTrace: "TT123" },
      });

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/shipments");
      expect(init.method).toBe("POST");
    });
  });

  describe("getReturns", () => {
    it("builds query params with handled and fulfilmentMethod", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ returns: [] }));

      await client.getReturns(1, false, "FBR");

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("handled=false");
      expect(url).toContain("fulfilment-method=FBR");
    });
  });

  describe("getReturn", () => {
    it("fetches return by ID", async () => {
      const ret = { returnId: "ret-1", returnItems: [] };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(ret));

      const result = await client.getReturn("ret-1");
      expect(result).toEqual(ret);
    });
  });

  describe("handleReturn", () => {
    it("sends PUT with handling data", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ processStatusId: "1", status: "PENDING" }));

      await client.handleReturn("rma-1", {
        handlingResult: "RETURN_RECEIVED",
        quantityReturned: 1,
      });

      const [url, init] = mockFetch.mock.calls[1];
      expect(url).toContain("/returns/rma-1");
      expect(init.method).toBe("PUT");
    });
  });

  describe("getInvoices", () => {
    it("builds query params with period", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ invoiceListItems: [] }));

      await client.getInvoices("2024-01-01", "2024-01-31");

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("period=2024-01-01%2F2024-01-31");
    });

    it("uses same date for start and end when only start provided", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ invoiceListItems: [] }));

      await client.getInvoices("2024-01-01");

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("period=2024-01-01%2F2024-01-01");
    });

    it("omits period param when no dates provided", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ invoiceListItems: [] }));

      await client.getInvoices();

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("/invoices");
      expect(url).not.toContain("period=");
    });
  });

  describe("getInvoice", () => {
    it("fetches invoice by ID", async () => {
      const invoice = { invoiceId: "inv-1" };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(invoice));

      const result = await client.getInvoice("inv-1");
      expect(result).toEqual(invoice);
    });
  });

  describe("getCommission", () => {
    it("builds correct query params", async () => {
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({ ean: "123", condition: "NEW", unitPrice: 10, fixedAmount: 1, percentage: 10, totalCost: 2 }));

      await client.getCommission("1234567890123", "NEW", 10.99);

      const [url] = mockFetch.mock.calls[1];
      expect(url).toContain("/commission/1234567890123");
      expect(url).toContain("condition=NEW");
      expect(url).toContain("unit-price=10.99");
    });
  });

  describe("getProcessStatus", () => {
    it("fetches process status by ID", async () => {
      const ps = { processStatusId: "ps-1", status: "SUCCESS" };
      mockFetch
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse(ps));

      const result = await client.getProcessStatus("ps-1");
      expect(result).toEqual(ps);
    });
  });

  describe("BolApiError", () => {
    it("has correct properties", () => {
      const error = new BolApiError("test", 404, { detail: "not found" });
      expect(error.message).toBe("test");
      expect(error.status).toBe(404);
      expect(error.details).toEqual({ detail: "not found" });
      expect(error).toBeInstanceOf(Error);
    });

    it("works without details", () => {
      const error = new BolApiError("test", 500);
      expect(error.details).toBeUndefined();
    });
  });
});
