import { TtlCache } from "./cache.js";
import type {
  Order,
  OrdersResponse,
  CancellationRequest,
  Offer,
  CreateOfferRequest,
  UpdateOfferRequest,
  UpdateOfferPriceRequest,
  UpdateOfferStockRequest,
  CreateOfferExportRequest,
  CreateUnpublishedOfferReportRequest,
  Shipment,
  ShipmentsResponse,
  CreateShipmentRequest,
  InvoiceRequestsResponse,
  Return,
  ReturnsResponse,
  HandleReturnRequest,
  CreateReturnRequest,
  InvoicesResponse,
  InvoiceSpecificationResponse,
  Commission,
  BulkCommissionRequest,
  BulkCommissionResponse,
  CommissionProductsRequest,
  BulkCommissionRatesResponse,
  ProcessStatus,
  ProcessStatusResponse,
  BulkProcessStatusRequest,
  ProcessStatusEventType,
  ProductCategoriesResponse,
  ProductListRequest,
  ProductListResponse,
  ProductListFiltersResponse,
  ProductAssetsResponse,
  CompetingOffersResponse,
  ProductPlacementResponse,
  PriceStarBoundaries,
  ProductIdsResponse,
  ProductRatingsResponse,
  CatalogProduct,
  CreateProductContentRequest,
  UploadReportResponse,
  ChunkRecommendationsRequest,
  ChunkRecommendationsResponse,
  OfferInsightsResponse,
  PerformanceIndicatorsResponse,
  ProductRanksResponse,
  SalesForecastResponse,
  SearchTermsResponse,
  InventoryResponse,
  PromotionsResponse,
  PromotionResponse,
  PromotionProductsResponse,
  ReplenishmentsResponse,
  ReplenishmentResponse,
  CreateReplenishmentRequest,
  UpdateReplenishmentRequest,
  DeliveryDatesResponse,
  PickupTimeSlotsRequest,
  PickupTimeSlotsResponse,
  RequestProductDestinationsRequest,
  ProductDestinationsResponse,
  ProductLabelsRequest,
  RetailerInformationResponse,
  ShippingLabelRequest,
  DeliveryOptionsRequest,
  DeliveryOptionsResponse,
  SubscriptionsResponse,
  SubscriptionResponse,
  SubscriptionRequest,
  KeySetResponse,
  ChangeTransportRequest,
} from "./types.js";

export class BolApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface RetryOptions {
  maxRetries: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

const DEFAULT_RETRY: RetryOptions = { maxRetries: 3 };

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class BolClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly retry: RetryOptions;
  private readonly cache: TtlCache;
  private readonly cachingEnabled: boolean;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    clientId: string,
    clientSecret: string,
    baseUrl = "https://api.bol.com/retailer",
    cacheTtlMs?: number,
    retry: RetryOptions = DEFAULT_RETRY,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.retry = retry;
    this.cachingEnabled = cacheTtlMs !== 0;
    this.cache = new TtlCache(cacheTtlMs ?? 120_000);
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch("https://login.bol.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new BolApiError(
        `Authentication failed: ${response.status} ${response.statusText}`,
        response.status,
        await BolClient.parseBody(response),
      );
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    // Refresh 60 seconds before actual expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  private async cachedRequest<T>(cacheKey: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    if (!this.cachingEnabled || ttlMs <= 0) return fetcher();

    const cached = this.cache.get<T>(cacheKey);
    if (cached !== undefined) return cached;

    const result = await fetcher();
    this.cache.set(cacheKey, result, ttlMs);
    return result;
  }

  // --- Orders ---

  async getOrders(
    page = 1,
    fulfilmentMethod?: string,
    status?: string,
    changeIntervalMinute?: number,
    latestChangeDate?: string,
  ): Promise<OrdersResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (fulfilmentMethod) {
      query.set("fulfilment-method", fulfilmentMethod);
    }
    if (status) {
      query.set("status", status);
    }
    if (changeIntervalMinute !== undefined) {
      query.set("change-interval-minute", String(changeIntervalMinute));
    }
    if (latestChangeDate) {
      query.set("latest-change-date", latestChangeDate);
    }
    return this.cachedRequest(
      `orders:${page}:${fulfilmentMethod ?? ""}:${status ?? ""}:${changeIntervalMinute ?? ""}:${latestChangeDate ?? ""}`,
      60_000,
      () => this.request<OrdersResponse>(`/orders?${query.toString()}`),
    );
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.cachedRequest(
      `order:${orderId}`,
      60_000,
      () => this.request<Order>(`/orders/${encodeURIComponent(orderId)}`),
    );
  }

  async cancelOrderItems(data: CancellationRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/orders/cancellation", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    this.cache.invalidate("order:");
    return result;
  }

  // --- Offers ---

  async getOffer(offerId: string): Promise<Offer> {
    return this.cachedRequest(
      `offer:${offerId}`,
      120_000,
      () => this.request<Offer>(`/offers/${encodeURIComponent(offerId)}`),
    );
  }

  async createOffer(data: CreateOfferRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/offers", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.cache.invalidate("offer:");
    return result;
  }

  async updateOffer(offerId: string, data: UpdateOfferRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/offers/${encodeURIComponent(offerId)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate(`offer:${offerId}`);
    return result;
  }

  async deleteOffer(offerId: string): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/offers/${encodeURIComponent(offerId)}`,
      { method: "DELETE" },
    );
    this.cache.invalidate(`offer:${offerId}`);
    return result;
  }

  async updateOfferPrice(offerId: string, data: UpdateOfferPriceRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/offers/${encodeURIComponent(offerId)}/price`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate(`offer:${offerId}`);
    return result;
  }

  async updateOfferStock(offerId: string, data: UpdateOfferStockRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/offers/${encodeURIComponent(offerId)}/stock`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate(`offer:${offerId}`);
    return result;
  }

  async requestOfferExport(data?: CreateOfferExportRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/offers/export", {
      method: "POST",
      body: JSON.stringify(data ?? { format: "CSV" }),
    });
    return result;
  }

  async getOfferExport(reportId: string): Promise<string> {
    return this.request<string>(`/offers/export/${encodeURIComponent(reportId)}`);
  }

  async requestUnpublishedOfferReport(): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/offers/unpublished", {
      method: "POST",
      body: JSON.stringify({ format: "CSV" } satisfies CreateUnpublishedOfferReportRequest),
    });
    return result;
  }

  async getUnpublishedOfferReport(reportId: string): Promise<string> {
    return this.request<string>(`/offers/unpublished/${encodeURIComponent(reportId)}`);
  }

  // --- Shipments ---

  async getShipments(page = 1, orderId?: string, fulfilmentMethod?: string): Promise<ShipmentsResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (orderId) {
      query.set("order-id", orderId);
    }
    if (fulfilmentMethod) {
      query.set("fulfilment-method", fulfilmentMethod);
    }
    return this.cachedRequest(
      `shipments:${page}:${orderId ?? ""}:${fulfilmentMethod ?? ""}`,
      60_000,
      () => this.request<ShipmentsResponse>(`/shipments?${query.toString()}`),
    );
  }

  async getShipment(shipmentId: string): Promise<Shipment> {
    return this.cachedRequest(
      `shipment:${shipmentId}`,
      120_000,
      () => this.request<Shipment>(`/shipments/${encodeURIComponent(shipmentId)}`),
    );
  }

  async createShipment(data: CreateShipmentRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/shipments", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.cache.invalidate("shipment");
    return result;
  }

  async getShipmentInvoiceRequests(page = 1, shipmentId?: string, state?: string): Promise<InvoiceRequestsResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (shipmentId) {
      query.set("shipment-id", shipmentId);
    }
    if (state) {
      query.set("state", state);
    }
    return this.cachedRequest(
      `shipment-invoices:${page}:${shipmentId ?? ""}:${state ?? ""}`,
      60_000,
      () => this.request<InvoiceRequestsResponse>(`/shipments/invoices/requests?${query.toString()}`),
    );
  }

  async uploadShipmentInvoice(shipmentId: string, invoice: string): Promise<ProcessStatus> {
    return this.request<ProcessStatus>(
      `/shipments/invoices/${encodeURIComponent(shipmentId)}`,
      {
        method: "POST",
        body: invoice,
      },
    );
  }

  // --- Returns ---

  async getReturns(page = 1, handled?: boolean, fulfilmentMethod?: string): Promise<ReturnsResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (handled !== undefined) {
      query.set("handled", String(handled));
    }
    if (fulfilmentMethod) {
      query.set("fulfilment-method", fulfilmentMethod);
    }
    return this.cachedRequest(
      `returns:${page}:${handled ?? ""}:${fulfilmentMethod ?? ""}`,
      60_000,
      () => this.request<ReturnsResponse>(`/returns?${query.toString()}`),
    );
  }

  async getReturn(returnId: string): Promise<Return> {
    return this.cachedRequest(
      `return:${returnId}`,
      60_000,
      () => this.request<Return>(`/returns/${encodeURIComponent(returnId)}`),
    );
  }

  async handleReturn(rmaId: string, data: HandleReturnRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/returns/${encodeURIComponent(rmaId)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate("return:");
    return result;
  }

  async createReturn(data: CreateReturnRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/returns", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.cache.invalidate("return:");
    return result;
  }

  // --- Invoices ---

  async getInvoices(periodStartDate?: string, periodEndDate?: string): Promise<InvoicesResponse> {
    const query = new URLSearchParams();
    if (periodStartDate) {
      query.set("period-start-date", periodStartDate);
    }
    if (periodEndDate) {
      query.set("period-end-date", periodEndDate);
    }
    const qs = query.toString();
    const path = qs ? `/invoices?${qs}` : "/invoices";
    return this.cachedRequest(
      `invoices:${periodStartDate ?? ""}:${periodEndDate ?? ""}`,
      300_000,
      () => this.request<InvoicesResponse>(path),
    );
  }

  async getInvoice(invoiceId: string): Promise<Record<string, unknown>> {
    return this.cachedRequest(
      `invoice:${invoiceId}`,
      300_000,
      () => this.request<Record<string, unknown>>(`/invoices/${encodeURIComponent(invoiceId)}`),
    );
  }

  async getInvoiceSpecification(invoiceId: string, page = 1): Promise<InvoiceSpecificationResponse> {
    const query = new URLSearchParams({ page: String(page) });
    return this.cachedRequest(
      `invoice-spec:${invoiceId}:${page}`,
      300_000,
      () => this.request<InvoiceSpecificationResponse>(
        `/invoices/${encodeURIComponent(invoiceId)}/specification?${query.toString()}`,
      ),
    );
  }

  // --- Commissions ---

  async getCommission(ean: string, condition: string, unitPrice: number): Promise<Commission> {
    const query = new URLSearchParams({
      condition,
      "unit-price": String(unitPrice),
    });
    return this.cachedRequest(
      `commission:${ean}:${condition}:${unitPrice}`,
      300_000,
      () => this.request<Commission>(`/commission/${encodeURIComponent(ean)}?${query.toString()}`),
    );
  }

  async getBulkCommissions(data: BulkCommissionRequest): Promise<BulkCommissionResponse> {
    return this.request<BulkCommissionResponse>("/commission", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCommissionRates(data: CommissionProductsRequest): Promise<BulkCommissionRatesResponse> {
    return this.request<BulkCommissionRatesResponse>("/commissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Products ---

  async getProductCategories(language?: string): Promise<ProductCategoriesResponse> {
    return this.cachedRequest(
      `product-categories:${language ?? ""}`,
      600_000,
      () => this.request<ProductCategoriesResponse>(
        "/products/categories",
        language ? { headers: { "Accept-Language": language } } : undefined,
      ),
    );
  }

  async getProductList(data: ProductListRequest): Promise<ProductListResponse> {
    return this.request<ProductListResponse>("/products/list", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProductListFilters(
    countryCode?: string,
    searchTerm?: string,
    categoryId?: string,
    language?: string,
  ): Promise<ProductListFiltersResponse> {
    const query = new URLSearchParams();
    if (countryCode) query.set("country-code", countryCode);
    if (searchTerm) query.set("search-term", searchTerm);
    if (categoryId) query.set("category-id", categoryId);
    const headers: Record<string, string> = {};
    if (language) headers["Accept-Language"] = language;
    return this.cachedRequest(
      `product-list-filters:${countryCode ?? ""}:${searchTerm ?? ""}:${categoryId ?? ""}`,
      300_000,
      () => this.request<ProductListFiltersResponse>(
        `/products/list-filters?${query.toString()}`,
        Object.keys(headers).length > 0 ? { headers } : undefined,
      ),
    );
  }

  async getProductAssets(ean: string, usage?: string): Promise<ProductAssetsResponse> {
    const query = new URLSearchParams();
    if (usage) query.set("usage", usage);
    const qs = query.toString();
    return this.cachedRequest(
      `product-assets:${ean}:${usage ?? ""}`,
      300_000,
      () => this.request<ProductAssetsResponse>(
        `/products/${encodeURIComponent(ean)}/assets${qs ? `?${qs}` : ""}`,
      ),
    );
  }

  async getCompetingOffers(
    ean: string,
    page = 1,
    countryCode?: string,
    bestOfferOnly?: boolean,
    condition?: string,
  ): Promise<CompetingOffersResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (countryCode) query.set("country-code", countryCode);
    if (bestOfferOnly !== undefined) query.set("best-offer-only", String(bestOfferOnly));
    if (condition) query.set("condition", condition);
    return this.cachedRequest(
      `competing-offers:${ean}:${page}:${countryCode ?? ""}:${bestOfferOnly ?? ""}:${condition ?? ""}`,
      120_000,
      () => this.request<CompetingOffersResponse>(
        `/products/${encodeURIComponent(ean)}/offers?${query.toString()}`,
      ),
    );
  }

  async getProductPlacement(ean: string, countryCode?: string, language?: string): Promise<ProductPlacementResponse> {
    const query = new URLSearchParams();
    if (countryCode) query.set("country-code", countryCode);
    const headers: Record<string, string> = {};
    if (language) headers["Accept-Language"] = language;
    const qs = query.toString();
    return this.cachedRequest(
      `product-placement:${ean}:${countryCode ?? ""}`,
      300_000,
      () => this.request<ProductPlacementResponse>(
        `/products/${encodeURIComponent(ean)}/placement${qs ? `?${qs}` : ""}`,
        Object.keys(headers).length > 0 ? { headers } : undefined,
      ),
    );
  }

  async getPriceStarBoundaries(ean: string): Promise<PriceStarBoundaries> {
    return this.cachedRequest(
      `price-star-boundaries:${ean}`,
      300_000,
      () => this.request<PriceStarBoundaries>(
        `/products/${encodeURIComponent(ean)}/price-star-boundaries`,
      ),
    );
  }

  async getProductIds(ean: string): Promise<ProductIdsResponse> {
    return this.cachedRequest(
      `product-ids:${ean}`,
      600_000,
      () => this.request<ProductIdsResponse>(
        `/products/${encodeURIComponent(ean)}/product-ids`,
      ),
    );
  }

  async getProductRatings(ean: string): Promise<ProductRatingsResponse> {
    return this.cachedRequest(
      `product-ratings:${ean}`,
      300_000,
      () => this.request<ProductRatingsResponse>(
        `/products/${encodeURIComponent(ean)}/ratings`,
      ),
    );
  }

  // --- Product Content ---

  async getCatalogProduct(ean: string, language?: string): Promise<CatalogProduct> {
    const headers: Record<string, string> = {};
    if (language) headers["Accept-Language"] = language;
    return this.cachedRequest(
      `catalog-product:${ean}:${language ?? ""}`,
      300_000,
      () => this.request<CatalogProduct>(
        `/content/catalog-products/${encodeURIComponent(ean)}`,
        Object.keys(headers).length > 0 ? { headers } : undefined,
      ),
    );
  }

  async createProductContent(data: CreateProductContentRequest): Promise<ProcessStatus> {
    return this.request<ProcessStatus>("/content/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getUploadReport(uploadId: string): Promise<UploadReportResponse> {
    return this.cachedRequest(
      `upload-report:${uploadId}`,
      120_000,
      () => this.request<UploadReportResponse>(
        `/content/upload-report/${encodeURIComponent(uploadId)}`,
      ),
    );
  }

  async getChunkRecommendations(data: ChunkRecommendationsRequest): Promise<ChunkRecommendationsResponse> {
    return this.request<ChunkRecommendationsResponse>("/content/chunk-recommendations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Insights ---

  async getOfferInsights(
    offerId: string,
    period: string,
    numberOfPeriods: number,
    name: string,
  ): Promise<OfferInsightsResponse> {
    const query = new URLSearchParams({
      "offer-id": offerId,
      period,
      "number-of-periods": String(numberOfPeriods),
      name,
    });
    return this.cachedRequest(
      `offer-insights:${offerId}:${period}:${numberOfPeriods}:${name}`,
      120_000,
      () => this.request<OfferInsightsResponse>(`/insights/offer?${query.toString()}`),
    );
  }

  async getPerformanceIndicators(
    name: string,
    year: string,
    week: string,
  ): Promise<PerformanceIndicatorsResponse> {
    const query = new URLSearchParams({ name, year, week });
    return this.cachedRequest(
      `performance-indicators:${name}:${year}:${week}`,
      300_000,
      () => this.request<PerformanceIndicatorsResponse>(
        `/insights/performance/indicator?${query.toString()}`,
      ),
    );
  }

  async getProductRanks(
    ean: string,
    date: string,
    type?: string,
    page = 1,
    language?: string,
  ): Promise<ProductRanksResponse> {
    const query = new URLSearchParams({ ean, date, page: String(page) });
    if (type) query.set("type", type);
    const headers: Record<string, string> = {};
    if (language) headers["Accept-Language"] = language;
    return this.cachedRequest(
      `product-ranks:${ean}:${date}:${type ?? ""}:${page}`,
      300_000,
      () => this.request<ProductRanksResponse>(
        `/insights/product-ranks?${query.toString()}`,
        Object.keys(headers).length > 0 ? { headers } : undefined,
      ),
    );
  }

  async getSalesForecast(offerId: string, weeksAhead: number): Promise<SalesForecastResponse> {
    const query = new URLSearchParams({
      "offer-id": offerId,
      "weeks-ahead": String(weeksAhead),
    });
    return this.cachedRequest(
      `sales-forecast:${offerId}:${weeksAhead}`,
      300_000,
      () => this.request<SalesForecastResponse>(`/insights/sales-forecast?${query.toString()}`),
    );
  }

  async getSearchTerms(
    searchTerm: string,
    period: string,
    numberOfPeriods: number,
    relatedSearchTerms?: boolean,
  ): Promise<SearchTermsResponse> {
    const query = new URLSearchParams({
      "search-term": searchTerm,
      period,
      "number-of-periods": String(numberOfPeriods),
    });
    if (relatedSearchTerms !== undefined) {
      query.set("related-search-terms", String(relatedSearchTerms));
    }
    return this.cachedRequest(
      `search-terms:${searchTerm}:${period}:${numberOfPeriods}:${relatedSearchTerms ?? ""}`,
      300_000,
      () => this.request<SearchTermsResponse>(`/insights/search-terms?${query.toString()}`),
    );
  }

  // --- Inventory ---

  async getInventory(
    page = 1,
    quantity?: string,
    stock?: string,
    state?: string,
    query?: string,
  ): Promise<InventoryResponse> {
    const params = new URLSearchParams({ page: String(page) });
    if (quantity) params.set("quantity", quantity);
    if (stock) params.set("stock", stock);
    if (state) params.set("state", state);
    if (query) params.set("query", query);
    return this.cachedRequest(
      `inventory:${page}:${quantity ?? ""}:${stock ?? ""}:${state ?? ""}:${query ?? ""}`,
      120_000,
      () => this.request<InventoryResponse>(`/inventory?${params.toString()}`),
    );
  }

  // --- Promotions ---

  async getPromotions(promotionType: string, page = 1): Promise<PromotionsResponse> {
    const query = new URLSearchParams({
      "promotion-type": promotionType,
      page: String(page),
    });
    return this.cachedRequest(
      `promotions:${promotionType}:${page}`,
      120_000,
      () => this.request<PromotionsResponse>(`/promotions?${query.toString()}`),
    );
  }

  async getPromotion(promotionId: string): Promise<PromotionResponse> {
    return this.cachedRequest(
      `promotion:${promotionId}`,
      120_000,
      () => this.request<PromotionResponse>(`/promotions/${encodeURIComponent(promotionId)}`),
    );
  }

  async getPromotionProducts(promotionId: string, page = 1): Promise<PromotionProductsResponse> {
    const query = new URLSearchParams({ page: String(page) });
    return this.cachedRequest(
      `promotion-products:${promotionId}:${page}`,
      120_000,
      () => this.request<PromotionProductsResponse>(
        `/promotions/${encodeURIComponent(promotionId)}/products?${query.toString()}`,
      ),
    );
  }

  // --- Replenishments ---

  async getReplenishments(
    page = 1,
    reference?: string,
    ean?: string,
    startDate?: string,
    endDate?: string,
    states?: string[],
  ): Promise<ReplenishmentsResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (reference) query.set("reference", reference);
    if (ean) query.set("ean", ean);
    if (startDate) query.set("start-date", startDate);
    if (endDate) query.set("end-date", endDate);
    if (states) {
      for (const s of states) query.append("state", s);
    }
    return this.cachedRequest(
      `replenishments:${page}:${reference ?? ""}:${ean ?? ""}:${startDate ?? ""}:${endDate ?? ""}:${states?.join(",") ?? ""}`,
      120_000,
      () => this.request<ReplenishmentsResponse>(`/replenishments?${query.toString()}`),
    );
  }

  async getReplenishment(replenishmentId: string): Promise<ReplenishmentResponse> {
    return this.cachedRequest(
      `replenishment:${replenishmentId}`,
      120_000,
      () => this.request<ReplenishmentResponse>(
        `/replenishments/${encodeURIComponent(replenishmentId)}`,
      ),
    );
  }

  async createReplenishment(data: CreateReplenishmentRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/replenishments", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.cache.invalidate("replenishment");
    return result;
  }

  async updateReplenishment(replenishmentId: string, data: UpdateReplenishmentRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/replenishments/${encodeURIComponent(replenishmentId)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate(`replenishment:${replenishmentId}`);
    return result;
  }

  async getDeliveryDates(): Promise<DeliveryDatesResponse> {
    return this.cachedRequest(
      "delivery-dates",
      300_000,
      () => this.request<DeliveryDatesResponse>("/replenishments/delivery-dates"),
    );
  }

  async getPickupTimeSlots(data: PickupTimeSlotsRequest): Promise<PickupTimeSlotsResponse> {
    return this.request<PickupTimeSlotsResponse>("/replenishments/pickup-time-slots", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async requestProductDestinations(data: RequestProductDestinationsRequest): Promise<ProcessStatus> {
    return this.request<ProcessStatus>("/replenishments/product-destinations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProductDestinations(productDestinationsId: string): Promise<ProductDestinationsResponse> {
    return this.cachedRequest(
      `product-destinations:${productDestinationsId}`,
      120_000,
      () => this.request<ProductDestinationsResponse>(
        `/replenishments/product-destinations/${encodeURIComponent(productDestinationsId)}`,
      ),
    );
  }

  async requestProductLabels(data: ProductLabelsRequest): Promise<string> {
    return this.request<string>("/replenishments/product-labels", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getLoadCarrierLabels(replenishmentId: string, labelType?: string): Promise<string> {
    const query = new URLSearchParams();
    if (labelType) query.set("label-type", labelType);
    const qs = query.toString();
    return this.request<string>(
      `/replenishments/${encodeURIComponent(replenishmentId)}/load-carrier-labels${qs ? `?${qs}` : ""}`,
    );
  }

  async getPickList(replenishmentId: string): Promise<string> {
    return this.request<string>(
      `/replenishments/${encodeURIComponent(replenishmentId)}/pick-list`,
    );
  }

  // --- Retailers ---

  async getRetailerInformation(retailerId = "current"): Promise<RetailerInformationResponse> {
    return this.cachedRequest(
      `retailer:${retailerId}`,
      600_000,
      () => this.request<RetailerInformationResponse>(
        `/retailers/${encodeURIComponent(retailerId)}`,
      ),
    );
  }

  // --- Shipping Labels ---

  async createShippingLabel(data: ShippingLabelRequest): Promise<ProcessStatus> {
    return this.request<ProcessStatus>("/shipping-labels", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getDeliveryOptions(data: DeliveryOptionsRequest): Promise<DeliveryOptionsResponse> {
    return this.request<DeliveryOptionsResponse>("/shipping-labels/delivery-options", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getShippingLabel(shippingLabelId: string): Promise<string> {
    return this.request<string>(
      `/shipping-labels/${encodeURIComponent(shippingLabelId)}`,
    );
  }

  // --- Subscriptions ---

  async getSubscriptions(): Promise<SubscriptionsResponse> {
    return this.cachedRequest(
      "subscriptions",
      120_000,
      () => this.request<SubscriptionsResponse>("/subscriptions"),
    );
  }

  async createSubscription(data: SubscriptionRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.cache.invalidate("subscription");
    return result;
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    return this.cachedRequest(
      `subscription:${subscriptionId}`,
      120_000,
      () => this.request<SubscriptionResponse>(
        `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      ),
    );
  }

  async updateSubscription(subscriptionId: string, data: SubscriptionRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate(`subscription:${subscriptionId}`);
    return result;
  }

  async deleteSubscription(subscriptionId: string): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { method: "DELETE" },
    );
    this.cache.invalidate(`subscription:${subscriptionId}`);
    return result;
  }

  async getSignatureKeys(): Promise<KeySetResponse> {
    return this.cachedRequest(
      "signature-keys",
      600_000,
      () => this.request<KeySetResponse>("/subscriptions/signature-keys"),
    );
  }

  async testSubscription(subscriptionId: string): Promise<ProcessStatus> {
    return this.request<ProcessStatus>(
      `/subscriptions/test/${encodeURIComponent(subscriptionId)}`,
      { method: "POST" },
    );
  }

  // --- Transports ---

  async updateTransport(transportId: string, data: ChangeTransportRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/transports/${encodeURIComponent(transportId)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    return result;
  }

  // --- Process Status ---

  private get sharedBaseUrl(): string {
    return this.baseUrl.replace(/\/retailer$/, "/shared");
  }

  async getProcessStatus(processStatusId: string): Promise<ProcessStatus> {
    return this.requestUrl<ProcessStatus>(
      `${this.sharedBaseUrl}/process-status/${encodeURIComponent(processStatusId)}`,
    );
  }

  async getProcessStatusByEntityId(
    entityId: string,
    eventType: ProcessStatusEventType,
    page?: number,
  ): Promise<ProcessStatusResponse> {
    const params = new URLSearchParams({
      "entity-id": entityId,
      "event-type": eventType,
    });
    if (page) params.set("page", String(page));
    return this.requestUrl<ProcessStatusResponse>(
      `${this.sharedBaseUrl}/process-status?${params.toString()}`,
    );
  }

  async getProcessStatusBulk(processStatusIds: string[]): Promise<ProcessStatusResponse> {
    const body: BulkProcessStatusRequest = {
      processStatusQueries: processStatusIds.map((id) => ({ processStatusId: id })),
    };
    return this.requestUrl<ProcessStatusResponse>(
      `${this.sharedBaseUrl}/process-status`,
      { method: "POST", body: JSON.stringify(body) },
    );
  }

  // --- Private ---

  private static async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json") || contentType.includes("application/vnd.retailer")
      ? response.json().catch(() => null)
      : response.text().catch(() => "");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    return this.requestUrl<T>(`${this.baseUrl}${path}`, init);
  }

  private async requestUrl<T>(url: string, init?: RequestInit): Promise<T> {
    const token = await this.authenticate();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/vnd.retailer.v10+json");
    if (init?.body) {
      headers.set("Content-Type", "application/vnd.retailer.v10+json");
    }

    const requestInit: RequestInit = { ...init, headers };

    const maxRetries = Math.max(0, this.retry.maxRetries);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, requestInit);

      if (response.ok || response.status === 204 || response.status === 202) {
        if (response.status === 204) {
          return null as T;
        }
        return await BolClient.parseBody(response) as T;
      }

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = response.headers.get("retry-after");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt) * 1000;
        await sleep(delayMs);
        continue;
      }

      throw new BolApiError(
        `Bol.com API request failed: ${response.status} ${response.statusText}`,
        response.status,
        await BolClient.parseBody(response),
      );
    }

    /* v8 ignore next */
    throw new Error("Retry loop exited unexpectedly");
  }
}
