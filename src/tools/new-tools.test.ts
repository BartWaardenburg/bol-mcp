import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BolClient } from "../bol-client.js";
import { BolApiError } from "../bol-client.js";
import { registerProductTools } from "./products.js";
import { registerProductContentTools } from "./product-content.js";
import { registerInsightTools } from "./insights.js";
import { registerInventoryTools } from "./inventory.js";
import { registerPromotionTools } from "./promotions.js";
import { registerReplenishmentTools } from "./replenishments.js";
import { registerRetailerTools } from "./retailers.js";
import { registerShippingLabelTools } from "./shipping-labels.js";
import { registerSubscriptionTools } from "./subscriptions.js";
import { registerTransportTools } from "./transports.js";
import { registerProcessStatusTools } from "./process-status.js";

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
  // Products
  getProductCategories: vi.fn(),
  getProductList: vi.fn(),
  getProductListFilters: vi.fn(),
  getProductAssets: vi.fn(),
  getCompetingOffers: vi.fn(),
  getProductPlacement: vi.fn(),
  getPriceStarBoundaries: vi.fn(),
  getProductIds: vi.fn(),
  getProductRatings: vi.fn(),
  // Product Content
  getCatalogProduct: vi.fn(),
  createProductContent: vi.fn(),
  getUploadReport: vi.fn(),
  getChunkRecommendations: vi.fn(),
  // Insights
  getOfferInsights: vi.fn(),
  getPerformanceIndicators: vi.fn(),
  getProductRanks: vi.fn(),
  getSalesForecast: vi.fn(),
  getSearchTerms: vi.fn(),
  // Inventory
  getInventory: vi.fn(),
  // Promotions
  getPromotions: vi.fn(),
  getPromotion: vi.fn(),
  getPromotionProducts: vi.fn(),
  // Replenishments
  getReplenishments: vi.fn(),
  getReplenishment: vi.fn(),
  createReplenishment: vi.fn(),
  updateReplenishment: vi.fn(),
  getDeliveryDates: vi.fn(),
  getPickupTimeSlots: vi.fn(),
  requestProductDestinations: vi.fn(),
  getProductDestinations: vi.fn(),
  getLoadCarrierLabels: vi.fn(),
  getPickList: vi.fn(),
  requestProductLabels: vi.fn(),
  // Retailers
  getRetailerInformation: vi.fn(),
  // Shipping Labels
  getDeliveryOptions: vi.fn(),
  createShippingLabel: vi.fn(),
  getShippingLabel: vi.fn(),
  // Subscriptions
  getSubscriptions: vi.fn(),
  getSubscription: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  testSubscription: vi.fn(),
  getSignatureKeys: vi.fn(),
  // Transports
  updateTransport: vi.fn(),
  // Process Status
  getProcessStatus: vi.fn(),
  getProcessStatusByEntityId: vi.fn(),
  getProcessStatusBulk: vi.fn(),
});

const getText = (result: ToolResult): string => result.content[0].text;

// --- Product Tools ---

describe("Product Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerProductTools(server as never, client as unknown as BolClient);
  });

  describe("get_product_categories", () => {
    it("returns formatted categories", async () => {
      client.getProductCategories.mockResolvedValue({
        categories: [
          { categoryId: "1", categoryName: "Electronics" },
          { categoryId: "2", categoryName: "Books" },
        ],
      });

      const result = (await server.getHandler("get_product_categories")({
        language: "nl",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Electronics");
      expect(getText(result)).toContain("Books");
      expect(getText(result)).toContain("2");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductCategories.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_categories")({})) as ToolResult;

      expect(result.isError).toBe(true);
      expect(getText(result)).toContain("API failed");
    });
  });

  describe("get_product_list", () => {
    it("returns formatted products", async () => {
      client.getProductList.mockResolvedValue({
        products: [
          { ean: "1234567890123", title: "Samsung TV" },
          { ean: "9876543210987", title: "iPhone Case" },
        ],
      });

      const result = (await server.getHandler("get_product_list")({
        searchTerm: "electronics",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Samsung TV");
      expect(getText(result)).toContain("iPhone Case");
      expect(getText(result)).toContain("2 results");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductList.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_list")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_list_filters", () => {
    it("returns filters successfully", async () => {
      client.getProductListFilters.mockResolvedValue({
        filters: [{ filterId: "brand", filterName: "Brand" }],
      });

      const result = (await server.getHandler("get_product_list_filters")({})) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("filters retrieved successfully");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductListFilters.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_list_filters")({})) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_assets", () => {
    it("returns assets successfully", async () => {
      client.getProductAssets.mockResolvedValue({
        assets: [{ url: "https://example.com/img.jpg", usage: "PRIMARY" }],
      });

      const result = (await server.getHandler("get_product_assets")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("assets");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductAssets.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_assets")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_competing_offers", () => {
    it("returns formatted offers", async () => {
      client.getCompetingOffers.mockResolvedValue({
        offers: [
          { offerId: "OFF-1", price: 29.99, condition: "NEW", fulfilmentMethod: "FBR", bestOffer: true },
          { offerId: "OFF-2", price: 24.99, condition: "NEW", fulfilmentMethod: "FBB", bestOffer: false },
        ],
      });

      const result = (await server.getHandler("get_competing_offers")({
        ean: "1234567890123",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("OFF-1");
      expect(getText(result)).toContain("29.99");
      expect(getText(result)).toContain("OFF-2");
      expect(getText(result)).toContain("2 offers");
      expect(getText(result)).toContain("[BEST]");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns empty message when no offers", async () => {
      client.getCompetingOffers.mockResolvedValue({ offers: [] });

      const result = (await server.getHandler("get_competing_offers")({
        ean: "1234567890123",
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("0 offers");
    });

    it("returns error result on API failure", async () => {
      client.getCompetingOffers.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_competing_offers")({
        ean: "1234567890123",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_placement", () => {
    it("returns placement successfully", async () => {
      client.getProductPlacement.mockResolvedValue({
        placement: "TOP",
        category: "Electronics",
      });

      const result = (await server.getHandler("get_product_placement")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("placement");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductPlacement.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_placement")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_price_star_boundaries", () => {
    it("returns boundaries successfully", async () => {
      client.getPriceStarBoundaries.mockResolvedValue({
        boundaries: [{ star: 1, minPrice: 0, maxPrice: 10 }],
      });

      const result = (await server.getHandler("get_price_star_boundaries")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("star boundaries");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getPriceStarBoundaries.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_price_star_boundaries")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_ids", () => {
    it("returns IDs successfully", async () => {
      client.getProductIds.mockResolvedValue({
        bolProductId: "BOL-123",
        ean: "1234567890123",
      });

      const result = (await server.getHandler("get_product_ids")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductIds.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_ids")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_ratings", () => {
    it("returns formatted ratings", async () => {
      client.getProductRatings.mockResolvedValue({
        ratings: [
          { rating: 5, count: 80 },
          { rating: 4, count: 40 },
        ],
      });

      const result = (await server.getHandler("get_product_ratings")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("5 stars: 80");
      expect(getText(result)).toContain("4 stars: 40");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductRatings.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_ratings")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Product Content Tools ---

describe("Product Content Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerProductContentTools(server as never, client as unknown as BolClient);
  });

  describe("get_catalog_product", () => {
    it("returns formatted catalog product", async () => {
      client.getCatalogProduct.mockResolvedValue({
        title: "Samsung Galaxy S24",
        brand: "Samsung",
        category: "Smartphones",
        description: "Latest Samsung flagship phone",
      });

      const result = (await server.getHandler("get_catalog_product")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("Samsung Galaxy S24");
      expect(getText(result)).toContain("Samsung");
      expect(getText(result)).toContain("Smartphones");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getCatalogProduct.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_catalog_product")({
        ean: "1234567890123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("create_product_content", () => {
    it("returns process status on success", async () => {
      client.createProductContent.mockResolvedValue({
        processStatusId: "ps-content-1",
        status: "PENDING",
        entityId: "CONTENT-1",
      });

      const result = (await server.getHandler("create_product_content")({
        language: "nl",
        attributes: [{ id: "title", values: [{ value: "New Product" }] }, { id: "brand", values: [{ value: "TestBrand" }] }],
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("content creation initiated");
      expect(getText(result)).toContain("ps-content-1");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.createProductContent.mockRejectedValue(apiError);

      const result = (await server.getHandler("create_product_content")({
        language: "nl",
        attributes: [{ id: "title", values: [{ value: "New Product" }] }],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_upload_report", () => {
    it("returns formatted upload report", async () => {
      client.getUploadReport.mockResolvedValue({
        status: "COMPLETE",
        language: "nl",
        errors: [{ description: "Missing required field: brand" }],
      });

      const result = (await server.getHandler("get_upload_report")({
        uploadId: "upload-123",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("upload-123");
      expect(getText(result)).toContain("COMPLETE");
      expect(getText(result)).toContain("Missing required field: brand");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getUploadReport.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_upload_report")({
        uploadId: "upload-123",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_chunk_recommendations", () => {
    it("returns formatted recommendations", async () => {
      client.getChunkRecommendations.mockResolvedValue({
        recommendations: [
          { predictions: [{ chunkId: "title", probability: 0.95 }] },
          { predictions: [{ chunkId: "description", probability: 0.87 }] },
        ],
      });

      const result = (await server.getHandler("get_chunk_recommendations")({
        attributes: [{ id: "title", values: [{ value: "Test Product" }] }],
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Chunk Recommendations");
      expect(getText(result)).toContain("title");
      expect(getText(result)).toContain("0.95");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getChunkRecommendations.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_chunk_recommendations")({
        attributes: [{ id: "title", values: [{ value: "Test" }] }],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Insight Tools ---

describe("Insight Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerInsightTools(server as never, client as unknown as BolClient);
  });

  describe("get_offer_insights", () => {
    it("returns formatted insights", async () => {
      client.getOfferInsights.mockResolvedValue({
        offerInsights: [{ period: "2024-W01", value: 150 }],
      });

      const result = (await server.getHandler("get_offer_insights")({
        offerId: "OFF-1",
        period: "WEEK",
        numberOfPeriods: 4,
        name: "PRODUCT_VISITS",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("OFF-1");
      expect(getText(result)).toContain("PRODUCT_VISITS");
      expect(getText(result)).toContain("4 x WEEK");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getOfferInsights.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_offer_insights")({
        offerId: "OFF-1",
        period: "WEEK",
        numberOfPeriods: 4,
        name: "PRODUCT_VISITS",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_performance_indicators", () => {
    it("returns formatted indicators", async () => {
      client.getPerformanceIndicators.mockResolvedValue({
        score: 9.5,
        norm: 8.0,
      });

      const result = (await server.getHandler("get_performance_indicators")({
        name: "CANCELLATIONS",
        year: "2024",
        week: "10",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("CANCELLATIONS");
      expect(getText(result)).toContain("week 10");
      expect(getText(result)).toContain("2024");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getPerformanceIndicators.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_performance_indicators")({
        name: "CANCELLATIONS",
        year: "2024",
        week: "10",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_ranks", () => {
    it("returns formatted ranks", async () => {
      client.getProductRanks.mockResolvedValue({
        ranks: [{ searchTerm: "phone", rank: 3 }],
      });

      const result = (await server.getHandler("get_product_ranks")({
        ean: "1234567890123",
        date: "2024-01-15",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("2024-01-15");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductRanks.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_ranks")({
        ean: "1234567890123",
        date: "2024-01-15",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_sales_forecast", () => {
    it("returns formatted forecast", async () => {
      client.getSalesForecast.mockResolvedValue({
        forecast: [{ week: "2024-W05", units: 25 }],
      });

      const result = (await server.getHandler("get_sales_forecast")({
        offerId: "OFF-1",
        weeksAhead: 4,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("OFF-1");
      expect(getText(result)).toContain("4");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getSalesForecast.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_sales_forecast")({
        offerId: "OFF-1",
        weeksAhead: 4,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_search_terms", () => {
    it("returns formatted search terms", async () => {
      client.getSearchTerms.mockResolvedValue({
        searchTerms: { searchTerm: "phone case", totalCount: 5000 },
      });

      const result = (await server.getHandler("get_search_terms")({
        searchTerm: "phone case",
        period: "MONTH",
        numberOfPeriods: 3,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("phone case");
      expect(getText(result)).toContain("3 x MONTH");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getSearchTerms.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_search_terms")({
        searchTerm: "phone case",
        period: "MONTH",
        numberOfPeriods: 3,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Inventory Tools ---

describe("Inventory Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerInventoryTools(server as never, client as unknown as BolClient);
  });

  describe("get_inventory", () => {
    it("returns formatted inventory", async () => {
      client.getInventory.mockResolvedValue({
        inventory: [
          { ean: "1234567890123", title: "Widget A", regularStock: 50, gradedStock: 5 },
          { ean: "9876543210987", title: "Widget B", regularStock: 10, gradedStock: 0 },
        ],
      });

      const result = (await server.getHandler("get_inventory")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("Widget A");
      expect(getText(result)).toContain("50");
      expect(getText(result)).toContain("Widget B");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns empty message when no inventory", async () => {
      client.getInventory.mockResolvedValue({ inventory: [] });

      const result = (await server.getHandler("get_inventory")({
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("No inventory items found");
    });

    it("returns error result on API failure", async () => {
      client.getInventory.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_inventory")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Promotion Tools ---

describe("Promotion Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerPromotionTools(server as never, client as unknown as BolClient);
  });

  describe("list_promotions", () => {
    it("returns formatted promotions", async () => {
      client.getPromotions.mockResolvedValue({
        promotions: [
          {
            promotionId: "PROMO-1",
            title: "Summer Sale",
            startDateTime: "2024-06-01T00:00:00Z",
            endDateTime: "2024-06-30T23:59:59Z",
            type: "PRICE_OFF",
          },
        ],
      });

      const result = (await server.getHandler("list_promotions")({
        promotionType: "PRICE_OFF",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("PROMO-1");
      expect(getText(result)).toContain("Summer Sale");
      expect(getText(result)).toContain("PRICE_OFF");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns empty message when no promotions", async () => {
      client.getPromotions.mockResolvedValue({ promotions: [] });

      const result = (await server.getHandler("list_promotions")({
        promotionType: "AWARENESS",
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("No promotions found");
    });

    it("returns error result on API failure", async () => {
      client.getPromotions.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_promotions")({
        promotionType: "PRICE_OFF",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_promotion", () => {
    it("returns formatted promotion details", async () => {
      client.getPromotion.mockResolvedValue({
        promotionId: "PROMO-1",
        title: "Summer Sale",
        type: "PRICE_OFF",
        startDateTime: "2024-06-01T00:00:00Z",
        endDateTime: "2024-06-30T23:59:59Z",
      });

      const result = (await server.getHandler("get_promotion")({
        promotionId: "PROMO-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("PROMO-1");
      expect(getText(result)).toContain("Summer Sale");
      expect(getText(result)).toContain("PRICE_OFF");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getPromotion.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_promotion")({
        promotionId: "PROMO-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_promotion_products", () => {
    it("returns formatted promotion products", async () => {
      client.getPromotionProducts.mockResolvedValue({
        products: [
          { ean: "1234567890123", title: "Product A", unitPrice: 19.99 },
        ],
      });

      const result = (await server.getHandler("get_promotion_products")({
        promotionId: "PROMO-1",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("PROMO-1");
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("Product A");
      expect(getText(result)).toContain("19.99");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getPromotionProducts.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_promotion_products")({
        promotionId: "PROMO-1",
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Replenishment Tools ---

describe("Replenishment Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerReplenishmentTools(server as never, client as unknown as BolClient);
  });

  describe("list_replenishments", () => {
    it("returns formatted replenishments", async () => {
      client.getReplenishments.mockResolvedValue({
        replenishments: [
          {
            replenishmentId: "REP-1",
            reference: "MY-REF-1",
            creationDateTime: "2024-01-10T10:00:00Z",
            state: "ANNOUNCED",
            deliveryDateTime: "2024-01-15T10:00:00Z",
            numberOfLoadCarriers: 2,
          },
        ],
      });

      const result = (await server.getHandler("list_replenishments")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("REP-1");
      expect(getText(result)).toContain("MY-REF-1");
      expect(getText(result)).toContain("ANNOUNCED");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns empty message when no replenishments", async () => {
      client.getReplenishments.mockResolvedValue({ replenishments: [] });

      const result = (await server.getHandler("list_replenishments")({
        page: 1,
      })) as ToolResult;

      expect(getText(result)).toContain("No replenishments found");
    });

    it("returns error result on API failure", async () => {
      client.getReplenishments.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_replenishments")({
        page: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_replenishment", () => {
    it("returns formatted replenishment details", async () => {
      client.getReplenishment.mockResolvedValue({
        replenishmentId: "REP-1",
        reference: "MY-REF-1",
        state: "ANNOUNCED",
        creationDateTime: "2024-01-10T10:00:00Z",
        lines: [{ ean: "1234567890123", quantity: 100 }],
      });

      const result = (await server.getHandler("get_replenishment")({
        replenishmentId: "REP-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("REP-1");
      expect(getText(result)).toContain("MY-REF-1");
      expect(getText(result)).toContain("ANNOUNCED");
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("x100");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getReplenishment.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_replenishment")({
        replenishmentId: "REP-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("create_replenishment", () => {
    it("returns process status on success", async () => {
      client.createReplenishment.mockResolvedValue({
        processStatusId: "ps-rep-1",
        status: "PENDING",
        entityId: "REP-NEW",
      });

      const result = (await server.getHandler("create_replenishment")({
        reference: "MY-REP",
        labelingByBol: false,
        numberOfLoadCarriers: 1,
        deliveryInfo: { expectedDeliveryDate: "2024-02-01", transporterCode: "POSTNL" },
        lines: [{ ean: "1234567890123", quantity: 50 }],
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Replenishment creation initiated");
      expect(getText(result)).toContain("ps-rep-1");
      expect(getText(result)).toContain("MY-REP");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.createReplenishment.mockRejectedValue(apiError);

      const result = (await server.getHandler("create_replenishment")({
        reference: "MY-REP",
        labelingByBol: false,
        numberOfLoadCarriers: 1,
        deliveryInfo: { expectedDeliveryDate: "2024-02-01", transporterCode: "POSTNL" },
        lines: [{ ean: "1234567890123", quantity: 50 }],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("update_replenishment", () => {
    it("returns process status on success", async () => {
      client.updateReplenishment.mockResolvedValue({
        processStatusId: "ps-rep-2",
        status: "PENDING",
      });

      const result = (await server.getHandler("update_replenishment")({
        replenishmentId: "REP-1",
        state: "CANCELLED",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("update initiated");
      expect(getText(result)).toContain("REP-1");
      expect(getText(result)).toContain("ps-rep-2");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.updateReplenishment.mockRejectedValue(apiError);

      const result = (await server.getHandler("update_replenishment")({
        replenishmentId: "REP-1",
        state: "CANCELLED",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_delivery_dates", () => {
    it("returns formatted delivery dates", async () => {
      client.getDeliveryDates.mockResolvedValue({
        deliveryDates: ["2024-02-01", "2024-02-05", "2024-02-08"],
      });

      const result = (await server.getHandler("get_delivery_dates")({})) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("2024-02-01");
      expect(getText(result)).toContain("2024-02-05");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getDeliveryDates.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_delivery_dates")({})) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_pickup_time_slots", () => {
    it("returns formatted time slots", async () => {
      client.getPickupTimeSlots.mockResolvedValue({
        timeSlots: [
          { fromDateTime: "2024-02-01T08:00:00Z", toDateTime: "2024-02-01T12:00:00Z" },
          { fromDateTime: "2024-02-01T13:00:00Z", toDateTime: "2024-02-01T17:00:00Z" },
        ],
      });

      const result = (await server.getHandler("get_pickup_time_slots")({
        address: {
          streetName: "Papiermolenweg",
          houseNumber: "2",
          zipCode: "3014 DC",
          city: "Rotterdam",
          countryCode: "NL",
        },
        numberOfLoadCarriers: 1,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("08:00");
      expect(getText(result)).toContain("12:00");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getPickupTimeSlots.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_pickup_time_slots")({
        address: {
          streetName: "Papiermolenweg",
          houseNumber: "2",
          zipCode: "3014 DC",
          city: "Rotterdam",
          countryCode: "NL",
        },
        numberOfLoadCarriers: 1,
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("request_product_destinations", () => {
    it("returns process status on success", async () => {
      client.requestProductDestinations.mockResolvedValue({
        processStatusId: "ps-dest-1",
        status: "PENDING",
        entityId: "DEST-1",
      });

      const result = (await server.getHandler("request_product_destinations")({
        eans: ["1234567890123", "9876543210987"],
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("2 EAN(s)");
      expect(getText(result)).toContain("ps-dest-1");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.requestProductDestinations.mockRejectedValue(apiError);

      const result = (await server.getHandler("request_product_destinations")({
        eans: ["1234567890123"],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_product_destinations", () => {
    it("returns formatted destinations", async () => {
      client.getProductDestinations.mockResolvedValue({
        productDestinations: [
          { ean: "1234567890123", destination: "WH-A", warehouseCode: "WH001" },
        ],
      });

      const result = (await server.getHandler("get_product_destinations")({
        productDestinationsId: "DEST-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("DEST-1");
      expect(getText(result)).toContain("1234567890123");
      expect(getText(result)).toContain("WH-A");
      expect(getText(result)).toContain("WH001");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getProductDestinations.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_product_destinations")({
        productDestinationsId: "DEST-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_load_carrier_labels", () => {
    it("returns labels successfully", async () => {
      client.getLoadCarrierLabels.mockResolvedValue("PDF_BINARY_DATA");

      const result = (await server.getHandler("get_load_carrier_labels")({
        replenishmentId: "REP-1",
        labelType: "WAREHOUSE",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("REP-1");
      expect(client.getLoadCarrierLabels).toHaveBeenCalledWith("REP-1", "WAREHOUSE");
    });

    it("returns error result on API failure", async () => {
      client.getLoadCarrierLabels.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_load_carrier_labels")({
        replenishmentId: "REP-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_pick_list", () => {
    it("returns pick list successfully", async () => {
      client.getPickList.mockResolvedValue("PDF_BINARY_DATA");

      const result = (await server.getHandler("get_pick_list")({
        replenishmentId: "REP-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("REP-1");
      expect(client.getPickList).toHaveBeenCalledWith("REP-1");
    });

    it("returns error result on API failure", async () => {
      client.getPickList.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_pick_list")({
        replenishmentId: "REP-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("request_product_labels", () => {
    it("returns labels successfully", async () => {
      client.requestProductLabels.mockResolvedValue("PDF_BINARY_DATA");

      const result = (await server.getHandler("request_product_labels")({
        labelFormat: "AVERY_J8159",
        products: [{ ean: "1234567890123", quantity: 10 }],
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("1 product(s)");
      expect(client.requestProductLabels).toHaveBeenCalledWith({
        labelFormat: "AVERY_J8159",
        products: [{ ean: "1234567890123", quantity: 10 }],
      });
    });

    it("returns error result on API failure", async () => {
      client.requestProductLabels.mockRejectedValue(apiError);

      const result = (await server.getHandler("request_product_labels")({
        labelFormat: "AVERY_J8159",
        products: [{ ean: "1234567890123", quantity: 10 }],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Retailer Tools ---

describe("Retailer Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerRetailerTools(server as never, client as unknown as BolClient);
  });

  describe("get_retailer_information", () => {
    it("returns formatted retailer information", async () => {
      client.getRetailerInformation.mockResolvedValue({
        retailerId: "RET-1",
        displayName: "Test Shop",
        companyName: "Test Shop BV",
        topRetailer: true,
        registrationDate: "2020-01-15",
      });

      const result = (await server.getHandler("get_retailer_information")({})) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Test Shop");
      expect(getText(result)).toContain("RET-1");
      expect(getText(result)).toContain("Test Shop BV");
      expect(getText(result)).toContain("Top Retailer: true");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getRetailerInformation.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_retailer_information")({})) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Shipping Label Tools ---

describe("Shipping Label Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerShippingLabelTools(server as never, client as unknown as BolClient);
  });

  describe("get_delivery_options", () => {
    it("returns formatted delivery options", async () => {
      client.getDeliveryOptions.mockResolvedValue({
        deliveryOptions: [
          {
            shippingLabelOfferId: "SLO-1",
            transporterCode: "POSTNL",
            labelType: "PARCEL",
            labelPrice: { totalPrice: 6.95 },
          },
        ],
      });

      const result = (await server.getHandler("get_delivery_options")({
        orderItems: [{ orderItemId: "item-1" }],
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SLO-1");
      expect(getText(result)).toContain("POSTNL");
      expect(getText(result)).toContain("PARCEL");
      expect(getText(result)).toContain("6.95");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getDeliveryOptions.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_delivery_options")({
        orderItems: [{ orderItemId: "item-1" }],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("create_shipping_label", () => {
    it("returns process status on success", async () => {
      client.createShippingLabel.mockResolvedValue({
        processStatusId: "ps-label-1",
        status: "PENDING",
        entityId: "LABEL-1",
      });

      const result = (await server.getHandler("create_shipping_label")({
        orderItems: [{ orderItemId: "item-1" }],
        shippingLabelOfferId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Shipping label creation initiated");
      expect(getText(result)).toContain("ps-label-1");
      expect(getText(result)).toContain("1 item(s)");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.createShippingLabel.mockRejectedValue(apiError);

      const result = (await server.getHandler("create_shipping_label")({
        orderItems: [{ orderItemId: "item-1" }],
        shippingLabelOfferId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_shipping_label", () => {
    it("returns shipping label successfully", async () => {
      client.getShippingLabel.mockResolvedValue("PDF_BINARY_DATA");

      const result = (await server.getHandler("get_shipping_label")({
        shippingLabelId: "LABEL-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("LABEL-1");
      expect(client.getShippingLabel).toHaveBeenCalledWith("LABEL-1");
    });

    it("returns error result on API failure", async () => {
      client.getShippingLabel.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_shipping_label")({
        shippingLabelId: "LABEL-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Subscription Tools ---

describe("Subscription Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerSubscriptionTools(server as never, client as unknown as BolClient);
  });

  describe("list_subscriptions", () => {
    it("returns formatted subscriptions", async () => {
      client.getSubscriptions.mockResolvedValue({
        subscriptions: [
          {
            id: "SUB-1",
            subscriptionType: "WEBHOOK",
            url: "https://example.com/webhook",
            enabled: true,
            resources: ["ORDER", "SHIPMENT"],
          },
        ],
      });

      const result = (await server.getHandler("list_subscriptions")({})) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SUB-1");
      expect(getText(result)).toContain("WEBHOOK");
      expect(getText(result)).toContain("https://example.com/webhook");
      expect(getText(result)).toContain("ORDER");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns empty message when no subscriptions", async () => {
      client.getSubscriptions.mockResolvedValue({ subscriptions: [] });

      const result = (await server.getHandler("list_subscriptions")({})) as ToolResult;

      expect(getText(result)).toContain("No subscriptions found");
    });

    it("returns error result on API failure", async () => {
      client.getSubscriptions.mockRejectedValue(apiError);

      const result = (await server.getHandler("list_subscriptions")({})) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_subscription", () => {
    it("returns formatted subscription details", async () => {
      client.getSubscription.mockResolvedValue({
        id: "SUB-1",
        subscriptionType: "WEBHOOK",
        url: "https://example.com/webhook",
        enabled: true,
        resources: ["ORDER", "SHIPMENT"],
      });

      const result = (await server.getHandler("get_subscription")({
        subscriptionId: "SUB-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SUB-1");
      expect(getText(result)).toContain("WEBHOOK");
      expect(getText(result)).toContain("https://example.com/webhook");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getSubscription.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_subscription")({
        subscriptionId: "SUB-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("create_subscription", () => {
    it("returns process status on success", async () => {
      client.createSubscription.mockResolvedValue({
        processStatusId: "ps-sub-1",
        status: "PENDING",
        entityId: "SUB-NEW",
      });

      const result = (await server.getHandler("create_subscription")({
        resources: ["ORDER", "SHIPMENT"],
        url: "https://example.com/webhook",
        subscriptionType: "WEBHOOK",
        enabled: true,
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("Subscription created");
      expect(getText(result)).toContain("ps-sub-1");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.createSubscription.mockRejectedValue(apiError);

      const result = (await server.getHandler("create_subscription")({
        resources: ["ORDER"],
        url: "https://example.com/webhook",
        subscriptionType: "WEBHOOK",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("update_subscription", () => {
    it("returns process status on success", async () => {
      client.updateSubscription.mockResolvedValue({
        processStatusId: "ps-sub-2",
        status: "PENDING",
      });

      const result = (await server.getHandler("update_subscription")({
        subscriptionId: "SUB-1",
        resources: ["ORDER"],
        url: "https://example.com/webhook-v2",
        subscriptionType: "WEBHOOK",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SUB-1");
      expect(getText(result)).toContain("update initiated");
      expect(getText(result)).toContain("ps-sub-2");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.updateSubscription.mockRejectedValue(apiError);

      const result = (await server.getHandler("update_subscription")({
        subscriptionId: "SUB-1",
        resources: ["ORDER"],
        url: "https://example.com/webhook",
        subscriptionType: "WEBHOOK",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("delete_subscription", () => {
    it("returns process status on success", async () => {
      client.deleteSubscription.mockResolvedValue({
        processStatusId: "ps-sub-3",
        status: "PENDING",
      });

      const result = (await server.getHandler("delete_subscription")({
        subscriptionId: "SUB-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SUB-1");
      expect(getText(result)).toContain("deletion initiated");
      expect(getText(result)).toContain("ps-sub-3");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.deleteSubscription.mockRejectedValue(apiError);

      const result = (await server.getHandler("delete_subscription")({
        subscriptionId: "SUB-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("test_subscription", () => {
    it("returns process status on success", async () => {
      client.testSubscription.mockResolvedValue({
        processStatusId: "ps-sub-4",
        status: "PENDING",
      });

      const result = (await server.getHandler("test_subscription")({
        subscriptionId: "SUB-1",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("SUB-1");
      expect(getText(result)).toContain("Test notification sent");
      expect(getText(result)).toContain("ps-sub-4");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.testSubscription.mockRejectedValue(apiError);

      const result = (await server.getHandler("test_subscription")({
        subscriptionId: "SUB-1",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_signature_keys", () => {
    it("returns formatted signature keys", async () => {
      client.getSignatureKeys.mockResolvedValue({
        signatureKeys: [
          { id: "KEY-1", type: "RSA", publicKey: "MIIBIjANBgkq..." },
        ],
      });

      const result = (await server.getHandler("get_signature_keys")({})) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("KEY-1");
      expect(getText(result)).toContain("RSA");
      expect(getText(result)).toContain("MIIBIjANBgkq");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.getSignatureKeys.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_signature_keys")({})) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Transport Tools ---

describe("Transport Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerTransportTools(server as never, client as unknown as BolClient);
  });

  describe("update_transport", () => {
    it("returns process status on success", async () => {
      client.updateTransport.mockResolvedValue({
        processStatusId: "ps-trans-1",
        status: "PENDING",
      });

      const result = (await server.getHandler("update_transport")({
        transportId: "TRANS-1",
        trackAndTrace: "3SBOL1234567",
        transporterCode: "TNT",
      })) as ToolResult;

      expect(result.isError).toBeUndefined();
      expect(getText(result)).toContain("TRANS-1");
      expect(getText(result)).toContain("3SBOL1234567");
      expect(getText(result)).toContain("TNT");
      expect(getText(result)).toContain("ps-trans-1");
      expect(result.structuredContent).toBeDefined();
    });

    it("returns error result on API failure", async () => {
      client.updateTransport.mockRejectedValue(apiError);

      const result = (await server.getHandler("update_transport")({
        transportId: "TRANS-1",
        trackAndTrace: "3SBOL1234567",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});

// --- Process Status Tools ---

describe("Process Status Tools", () => {
  let server: ReturnType<typeof createMockServer>;
  let client: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    server = createMockServer();
    client = createMockClient();
    registerProcessStatusTools(server as never, client as unknown as BolClient);
  });

  describe("get_process_status", () => {
    it("returns process status details", async () => {
      client.getProcessStatus.mockResolvedValue({
        processStatusId: "ps-1",
        status: "SUCCESS",
        entityId: "987654321",
        eventType: "CREATE_SHIPMENT",
        description: "Shipment created",
        createTimestamp: "2024-01-01T10:00:00+01:00",
      });

      const result = (await server.getHandler("get_process_status")({
        processStatusId: "ps-1",
      })) as ToolResult;

      expect(getText(result)).toContain("ps-1");
      expect(getText(result)).toContain("SUCCESS");
      expect(getText(result)).toContain("987654321");
      expect(getText(result)).toContain("CREATE_SHIPMENT");
      expect(client.getProcessStatus).toHaveBeenCalledWith("ps-1");
    });

    it("shows error message when present", async () => {
      client.getProcessStatus.mockResolvedValue({
        processStatusId: "ps-2",
        status: "FAILURE",
        errorMessage: "Something went wrong",
      });

      const result = (await server.getHandler("get_process_status")({
        processStatusId: "ps-2",
      })) as ToolResult;

      expect(getText(result)).toContain("FAILURE");
      expect(getText(result)).toContain("Something went wrong");
    });

    it("handles API errors", async () => {
      client.getProcessStatus.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_process_status")({
        processStatusId: "ps-bad",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_process_status_by_entity", () => {
    it("returns process statuses for entity", async () => {
      client.getProcessStatusByEntityId.mockResolvedValue({
        processStatuses: [
          { processStatusId: "ps-1", status: "SUCCESS", description: "Done" },
          { processStatusId: "ps-2", status: "PENDING", description: "In progress" },
        ],
      });

      const result = (await server.getHandler("get_process_status_by_entity")({
        entityId: "987654321",
        eventType: "CREATE_SHIPMENT",
      })) as ToolResult;

      expect(getText(result)).toContain("2 process status(es)");
      expect(getText(result)).toContain("ps-1");
      expect(getText(result)).toContain("ps-2");
      expect(client.getProcessStatusByEntityId).toHaveBeenCalledWith(
        "987654321",
        "CREATE_SHIPMENT",
        undefined,
      );
    });

    it("passes page parameter", async () => {
      client.getProcessStatusByEntityId.mockResolvedValue({
        processStatuses: [],
      });

      const result = (await server.getHandler("get_process_status_by_entity")({
        entityId: "123",
        eventType: "CANCEL_ORDER",
        page: 2,
      })) as ToolResult;

      expect(getText(result)).toContain("No process statuses found");
      expect(client.getProcessStatusByEntityId).toHaveBeenCalledWith("123", "CANCEL_ORDER", 2);
    });

    it("handles API errors", async () => {
      client.getProcessStatusByEntityId.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_process_status_by_entity")({
        entityId: "123",
        eventType: "CREATE_SHIPMENT",
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });

  describe("get_process_status_bulk", () => {
    it("returns multiple process statuses", async () => {
      client.getProcessStatusBulk.mockResolvedValue({
        processStatuses: [
          { processStatusId: "ps-1", status: "SUCCESS" },
          { processStatusId: "ps-2", status: "FAILURE", errorMessage: "Failed" },
        ],
      });

      const result = (await server.getHandler("get_process_status_bulk")({
        processStatusIds: ["ps-1", "ps-2"],
      })) as ToolResult;

      expect(getText(result)).toContain("2 process status(es)");
      expect(getText(result)).toContain("ps-1");
      expect(getText(result)).toContain("ps-2");
      expect(getText(result)).toContain("Failed");
      expect(client.getProcessStatusBulk).toHaveBeenCalledWith(["ps-1", "ps-2"]);
    });

    it("handles empty results", async () => {
      client.getProcessStatusBulk.mockResolvedValue({
        processStatuses: [],
      });

      const result = (await server.getHandler("get_process_status_bulk")({
        processStatusIds: ["ps-nonexistent"],
      })) as ToolResult;

      expect(getText(result)).toContain("No process statuses found");
    });

    it("handles API errors", async () => {
      client.getProcessStatusBulk.mockRejectedValue(apiError);

      const result = (await server.getHandler("get_process_status_bulk")({
        processStatusIds: ["ps-1"],
      })) as ToolResult;

      expect(result.isError).toBe(true);
    });
  });
});
