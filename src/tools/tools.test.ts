import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BolClient } from "../bol-client.js";
import { BolApiError } from "../bol-client.js";
import { registerOrderTools } from "./orders.js";
import { registerOfferTools } from "./offers.js";
import { registerShipmentTools } from "./shipments.js";
import { registerReturnTools } from "./returns.js";
import { registerInvoiceTools } from "./invoices.js";
import { registerCommissionTools } from "./commissions.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

const createMockServer = () => {
  const handlers = new Map<string, ToolHandler>();
  return {
    registerTool: vi.fn((name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    }),
    getHandler: (name: string): ToolHandler => {
      const handler = handlers.get(name);
      if (!handler) throw new Error(`No handler registered for "${name}"`);
      return handler;
    },
  };
};

const apiError = new BolApiError("API failed", 500, { code: "INTERNAL" });

const createMockClient = (): Record<string, ReturnType<typeof vi.fn>> => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  getOffer: vi.fn(),
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  updateOfferPrice: vi.fn(),
  updateOfferStock: vi.fn(),
  getShipments: vi.fn(),
  getShipment: vi.fn(),
  createShipment: vi.fn(),
  getReturns: vi.fn(),
  getReturn: vi.fn(),
  handleReturn: vi.fn(),
  getInvoices: vi.fn(),
  getInvoice: vi.fn(),
  getCommission: vi.fn(),
  getProcessStatus: vi.fn(),
});

const getText = (result: ToolResult): string => result.content[0].text;

// --- Order Tools ---

describe("Order Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerOrderTools(server as never, client as unknown as BolClient);
  });

  describe("list_orders", () => {
    it("returns formatted orders", async () => {
      client.getOrders.mockResolvedValue({
        orders: [
          {
            orderId: "ORD-1",
            orderPlacedDateTime: "2024-01-01T12:00:00+01:00",
            orderItems: [
              {
                orderItemId: "item-1",
                product: { ean: "1234567890123", title: "Test Product" },
                quantity: 2,
                unitPrice: 19.99,
                fulfilment: { method: "FBR" },
              },
            ],
          },
        ],
      });

      const result = (await server.getHandler("list_orders")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("ORD-1");
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("Test Product");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns empty message when no orders", async () => {
      client.getOrders.mockResolvedValue({ orders: [] });

      const result = (await server.getHandler("list_orders")({
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("No orders found");
    });

    it("passes filters to client", async () => {
      client.getOrders.mockResolvedValue({ orders: [] });

      await server.getHandler("list_orders")({
        page: 2,
        fulfilmentMethod: "FBB",
        status: "OPEN",
      });

      expect(client.getOrders).toHaveBeenCalledWith(2, "FBB", "OPEN");
    });

    it("returns error result on API failure", async () => {
      client.getOrders.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_orders")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(getText(result)).toContain("API failed");
    });

    it("handles v9 flat fields gracefully", async () => {
      client.getOrders.mockResolvedValue({
        orders: [
          {
            orderId: "ORD-2",
            orderItems: [
              {
                orderItemId: "item-1",
                ean: "9876543210987",
                title: "Legacy Product",
                quantity: 1,
                offerPrice: 9.99,
                fulfilmentMethod: "FBR",
                fulfilment: { method: "FBR" },
              },
            ],
          },
        ],
      });

      const result = (await server.getHandler("list_orders")({ page: 1 })) as ToolResult;
      expect(getText(result)).toContain("9876543210987");
      expect(getText(result)).toContain("Legacy Product");
    });
  });

  describe("get_order", () => {
    it("returns formatted order details", async () => {
      client.getOrder.mockResolvedValue({
        orderId: "ORD-1",
        orderPlacedDateTime: "2024-01-01T12:00:00+01:00",
        shipmentDetails: { firstName: "Jan", surname: "de Vries", city: "Amsterdam" },
        orderItems: [
          {
            orderItemId: "item-1",
            product: { ean: "1234567890123", title: "Test Product" },
            quantity: 1,
            unitPrice: 29.99,
            quantityShipped: 1,
            fulfilment: { method: "FBR", latestDeliveryDate: "2024-01-03" },
          },
        ],
      });

      const result = (await server.getHandler("get_order")({
        orderId: "ORD-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("ORD-1");
      expect(getText(result)).toContain("Jan");
      expect(getText(result)).toContain("Amsterdam");
      expect(getText(result)).toContain("Shipped: 1");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getOrder.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_order")({
        orderId: "ORD-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Offer Tools ---

describe("Offer Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerOfferTools(server as never, client as unknown as BolClient);
  });

  describe("get_offer", () => {
    it("returns formatted offer details", async () => {
      client.getOffer.mockResolvedValue({
        offerId: "OFF-1",
        ean: "1234567890123",
        reference: "REF-1",
        condition: { name: "NEW", category: "NEW" },
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 19.99 }] },
        stock: { amount: 10, managedByRetailer: true },
        fulfilment: { method: "FBR", deliveryCode: "24uurs-21" },
        onHoldByRetailer: false,
      });

      const result = (await server.getHandler("get_offer")({
        offerId: "OFF-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("OFF-1");
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("19.99");
      expect(getText(result)).toContain("FBR");
      expect(getText(result)).toContain("24uurs-21");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getOffer.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_offer")({
        offerId: "OFF-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("create_offer", () => {
    it("returns process status on success", async () => {
      client.createOffer.mockResolvedValue({
        processStatusId: "ps-1",
        status: "PENDING",
        entityId: "OFF-NEW",
      });

      const result = (await server.getHandler("create_offer")({
        ean: "1234567890123",
        condition: { name: "NEW" },
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 10 }] },
        stock: { amount: 5, managedByRetailer: true },
        fulfilment: { method: "FBR" },
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Offer creation initiated");
      expect(getText(result)).toContain("ps-1");
      expect(getText(result)).toContain("OFF-NEW");
    });

    it("passes optional fields to client", async () => {
      client.createOffer.mockResolvedValue({
        processStatusId: "ps-1",
        status: "PENDING",
      });

      await server.getHandler("create_offer")({
        ean: "1234567890123",
        condition: { name: "NEW" },
        reference: "my-ref",
        onHoldByRetailer: true,
        unknownProductTitle: "My Product",
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 10 }] },
        stock: { amount: 5, managedByRetailer: true },
        fulfilment: { method: "FBR" },
      });

      const callArg = client.createOffer.mock.calls[0][0];
      expect(callArg.reference).toBe("my-ref");
      expect(callArg.onHoldByRetailer).toBe(true);
      expect(callArg.unknownProductTitle).toBe("My Product");
    });

    it("returns error result on API failure", async () => {
      client.createOffer.mockRejectedValue(apiError);

      const result = (await server.getHandler("create_offer")({
        ean: "1234567890123",
        condition: { name: "NEW" },
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 10 }] },
        stock: { amount: 5, managedByRetailer: true },
        fulfilment: { method: "FBR" },
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("update_offer", () => {
    it("returns process status on success", async () => {
      client.updateOffer.mockResolvedValue({
        processStatusId: "ps-2",
        status: "PENDING",
      });

      const result = (await server.getHandler("update_offer")({
        offerId: "OFF-1",
        reference: "new-ref",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Offer update initiated");
      expect(getText(result)).toContain("ps-2");
    });

    it("returns error result on API failure", async () => {
      client.updateOffer.mockRejectedValue(apiError);

      const result = (await server.getHandler("update_offer")({
        offerId: "OFF-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("delete_offer", () => {
    it("returns process status on success", async () => {
      client.deleteOffer.mockResolvedValue({
        processStatusId: "ps-3",
        status: "PENDING",
      });

      const result = (await server.getHandler("delete_offer")({
        offerId: "OFF-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Offer deletion initiated");
      expect(getText(result)).toContain("ps-3");
    });

    it("returns error result on API failure", async () => {
      client.deleteOffer.mockRejectedValue(apiError);

      const result = (await server.getHandler("delete_offer")({
        offerId: "OFF-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("update_offer_price", () => {
    it("returns process status on success", async () => {
      client.updateOfferPrice.mockResolvedValue({
        processStatusId: "ps-4",
        status: "PENDING",
      });

      const result = (await server.getHandler("update_offer_price")({
        offerId: "OFF-1",
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 15.99 }] },
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Price update initiated");
      expect(getText(result)).toContain("ps-4");
    });

    it("returns error result on API failure", async () => {
      client.updateOfferPrice.mockRejectedValue(apiError);

      const result = (await server.getHandler("update_offer_price")({
        offerId: "OFF-1",
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: 15 }] },
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("update_offer_stock", () => {
    it("returns process status on success", async () => {
      client.updateOfferStock.mockResolvedValue({
        processStatusId: "ps-5",
        status: "PENDING",
      });

      const result = (await server.getHandler("update_offer_stock")({
        offerId: "OFF-1",
        amount: 20,
        managedByRetailer: true,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Stock update initiated");
      expect(getText(result)).toContain("20 units");
      expect(getText(result)).toContain("ps-5");
    });

    it("returns error result on API failure", async () => {
      client.updateOfferStock.mockRejectedValue(apiError);

      const result = (await server.getHandler("update_offer_stock")({
        offerId: "OFF-1",
        amount: 20,
        managedByRetailer: true,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Shipment Tools ---

describe("Shipment Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerShipmentTools(server as never, client as unknown as BolClient);
  });

  describe("list_shipments", () => {
    it("returns formatted shipments", async () => {
      client.getShipments.mockResolvedValue({
        shipments: [
          {
            shipmentId: "SHIP-1",
            shipmentDateTime: "2024-01-02T10:00:00+01:00",
            order: { orderId: "ORD-1" },
            transport: { trackAndTrace: "TT123" },
            shipmentItems: [{ orderItemId: "item-1", orderId: "ORD-1" }],
          },
        ],
      });

      const result = (await server.getHandler("list_shipments")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SHIP-1");
      expect(getText(result)).toContain("ORD-1");
      expect(getText(result)).toContain("TT123");
    });

    it("returns empty message when no shipments", async () => {
      client.getShipments.mockResolvedValue({ shipments: [] });

      const result = (await server.getHandler("list_shipments")({
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("No shipments found");
    });

    it("returns error result on API failure", async () => {
      client.getShipments.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_shipments")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_shipment", () => {
    it("returns formatted shipment details", async () => {
      client.getShipment.mockResolvedValue({
        shipmentId: "SHIP-1",
        shipmentDateTime: "2024-01-02T10:00:00+01:00",
        shipmentReference: "REF-1",
        order: { orderId: "ORD-1" },
        transport: { transporterCode: "POSTNL", trackAndTrace: "TT123" },
        shipmentDetails: { firstName: "Piet", surname: "Jansen", city: "Utrecht" },
        shipmentItems: [{ orderItemId: "item-1", orderId: "ORD-1" }],
      });

      const result = (await server.getHandler("get_shipment")({
        shipmentId: "SHIP-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SHIP-1");
      expect(getText(result)).toContain("POSTNL");
      expect(getText(result)).toContain("Piet");
      expect(getText(result)).toContain("Utrecht");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getShipment.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_shipment")({
        shipmentId: "SHIP-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("create_shipment", () => {
    it("returns process status on success", async () => {
      client.createShipment.mockResolvedValue({
        processStatusId: "ps-1",
        status: "PENDING",
        entityId: "SHIP-NEW",
      });

      const result = (await server.getHandler("create_shipment")({
        orderItems: [{ orderItemId: "item-1" }],
        transport: { transporterCode: "TNT", trackAndTrace: "TT456" },
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Shipment creation initiated");
      expect(getText(result)).toContain("1 item(s)");
      expect(getText(result)).toContain("ps-1");
    });

    it("passes optional fields to client", async () => {
      client.createShipment.mockResolvedValue({
        processStatusId: "ps-1",
        status: "PENDING",
      });

      await server.getHandler("create_shipment")({
        orderItems: [{ orderItemId: "item-1", quantity: 2 }],
        shipmentReference: "my-shipment",
        shippingLabelId: "label-1",
        transport: { transporterCode: "DHL" },
      });

      const callArg = client.createShipment.mock.calls[0][0];
      expect(callArg.shipmentReference).toBe("my-shipment");
      expect(callArg.shippingLabelId).toBe("label-1");
      expect(callArg.transport.transporterCode).toBe("DHL");
    });

    it("returns error result on API failure", async () => {
      client.createShipment.mockRejectedValue(apiError);

      const result = (await server.getHandler("create_shipment")({
        orderItems: [{ orderItemId: "item-1" }],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Return Tools ---

describe("Return Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerReturnTools(server as never, client as unknown as BolClient);
  });

  describe("list_returns", () => {
    it("returns formatted returns", async () => {
      client.getReturns.mockResolvedValue({
        returns: [
          {
            returnId: "RET-1",
            registrationDateTime: "2024-01-05T08:00:00+01:00",
            fulfilmentMethod: "FBR",
            returnItems: [
              {
                ean: "1234567890123",
                title: "Test Product",
                expectedQuantity: 1,
                returnReason: { mainReason: "DEFECTIVE", detailedReason: "Broken screen" },
                handled: false,
              },
            ],
          },
        ],
      });

      const result = (await server.getHandler("list_returns")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("RET-1");
      expect(getText(result)).toContain("DEFECTIVE");
      expect(getText(result)).toContain("Broken screen");
    });

    it("returns empty message when no returns", async () => {
      client.getReturns.mockResolvedValue({ returns: [] });

      const result = (await server.getHandler("list_returns")({
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("No returns found");
    });

    it("passes filters to client", async () => {
      client.getReturns.mockResolvedValue({ returns: [] });

      await server.getHandler("list_returns")({
        page: 2,
        handled: false,
        fulfilmentMethod: "FBR",
      });

      expect(client.getReturns).toHaveBeenCalledWith(2, false, "FBR");
    });

    it("returns error result on API failure", async () => {
      client.getReturns.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_returns")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_return", () => {
    it("returns formatted return details", async () => {
      client.getReturn.mockResolvedValue({
        returnId: "RET-1",
        registrationDateTime: "2024-01-05T08:00:00+01:00",
        fulfilmentMethod: "FBR",
        returnItems: [
          {
            ean: "1234567890123",
            title: "Test Product",
            expectedQuantity: 1,
            orderId: "ORD-1",
            orderItemId: "item-1",
            returnReason: {
              mainReason: "DEFECTIVE",
              detailedReason: "Broken screen",
              customerComments: "Arrived broken",
            },
            trackAndTrace: "TT-RET-1",
            handled: false,
            processingResults: [
              {
                quantity: 1,
                processingResult: "ACCEPTED",
                handlingResult: "RETURN_RECEIVED",
              },
            ],
          },
        ],
      });

      const result = (await server.getHandler("get_return")({
        returnId: "RET-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("RET-1");
      expect(getText(result)).toContain("DEFECTIVE");
      expect(getText(result)).toContain("Arrived broken");
      expect(getText(result)).toContain("TT-RET-1");
      expect(getText(result)).toContain("ACCEPTED");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getReturn.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_return")({
        returnId: "RET-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("handle_return", () => {
    it("returns process status on success", async () => {
      client.handleReturn.mockResolvedValue({
        processStatusId: "ps-1",
        status: "PENDING",
      });

      const result = (await server.getHandler("handle_return")({
        rmaId: "RMA-1",
        handlingResult: "RETURN_RECEIVED",
        quantityReturned: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("RMA-1");
      expect(getText(result)).toContain("RETURN_RECEIVED");
      expect(getText(result)).toContain("1 items");
      expect(getText(result)).toContain("ps-1");
    });

    it("returns error result on API failure", async () => {
      client.handleReturn.mockRejectedValue(apiError);

      const result = (await server.getHandler("handle_return")({
        rmaId: "RMA-1",
        handlingResult: "RETURN_RECEIVED",
        quantityReturned: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Invoice Tools ---

describe("Invoice Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerInvoiceTools(server as never, client as unknown as BolClient);
  });

  describe("list_invoices", () => {
    it("returns formatted invoices", async () => {
      client.getInvoices.mockResolvedValue({
        invoiceListItems: [
          {
            invoiceId: "INV-1",
            invoiceType: "SELF_BILLING",
            issueDate: "2024-01-15",
            invoicePeriod: { startDate: "2024-01-01", endDate: "2024-01-14" },
            legalMonetaryTotal: { payableAmount: 150.50 },
          },
        ],
        period: "2024-01-01/2024-01-31",
      });

      const result = (await server.getHandler("list_invoices")({
        periodStartDate: "2024-01-01",
        periodEndDate: "2024-01-31",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("INV-1");
      expect(getText(result)).toContain("SELF_BILLING");
      expect(getText(result)).toContain("150.5");
    });

    it("returns empty message when no invoices", async () => {
      client.getInvoices.mockResolvedValue({ invoiceListItems: [] });

      const result = (await server.getHandler("list_invoices")({})) as ToolResult;

      expect(getText(result)).toContain("No invoices found");
    });

    it("returns error result on API failure", async () => {
      client.getInvoices.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_invoices")({})) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_invoice", () => {
    it("returns invoice details", async () => {
      client.getInvoice.mockResolvedValue({
        invoiceId: "INV-1",
        invoiceMediaType: "application/pdf",
      });

      const result = (await server.getHandler("get_invoice")({
        invoiceId: "INV-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("INV-1");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getInvoice.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_invoice")({
        invoiceId: "INV-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Commission Tools ---

describe("Commission Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerCommissionTools(server as never, client as unknown as BolClient);
  });

  describe("get_commission", () => {
    it("returns formatted commission details", async () => {
      client.getCommission.mockResolvedValue({
        ean: "1234567890123",
        condition: "NEW",
        unitPrice: 19.99,
        fixedAmount: 0.50,
        percentage: 15,
        totalCost: 3.50,
        totalCostWithoutReduction: 4.00,
        reductions: [
          {
            maximumPrice: 50,
            costReduction: 0.50,
            startDate: "2024-01-01",
            endDate: "2024-03-31",
          },
        ],
      });

      const result = (await server.getHandler("get_commission")({
        ean: "1234567890123",
        condition: "NEW",
        unitPrice: 19.99,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("15%");
      expect(getText(result)).toContain("3.5");
      expect(getText(result)).toContain("Active reductions");
      expect(getText(result)).toContain("0.5");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns commission without reductions", async () => {
      client.getCommission.mockResolvedValue({
        ean: "1234567890123",
        condition: "NEW",
        unitPrice: 19.99,
        fixedAmount: 0.50,
        percentage: 15,
        totalCost: 3.50,
      });

      const result = (await server.getHandler("get_commission")({
        ean: "1234567890123",
        condition: "NEW",
        unitPrice: 19.99,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).not.toContain("Active reductions");
    });

    it("returns error result on API failure", async () => {
      client.getCommission.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_commission")({
        ean: "1234567890123",
        condition: "NEW",
        unitPrice: 19.99,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});
