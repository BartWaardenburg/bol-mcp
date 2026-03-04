import { TtlCache } from "./cache.js";
import type {
  Order,
  OrdersResponse,
  Offer,
  CreateOfferRequest,
  UpdateOfferRequest,
  UpdateOfferPriceRequest,
  UpdateOfferStockRequest,
  Shipment,
  ShipmentsResponse,
  CreateShipmentRequest,
  Return,
  ReturnsResponse,
  HandleReturnRequest,
  Invoice,
  InvoicesResponse,
  Commission,
  ProcessStatus,
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

  async getOrders(page = 1, fulfilmentMethod?: string): Promise<OrdersResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (fulfilmentMethod) {
      query.set("fulfilment-method", fulfilmentMethod);
    }
    return this.cachedRequest(
      `orders:${page}:${fulfilmentMethod ?? ""}`,
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

  // --- Shipments ---

  async getShipments(page = 1, orderId?: string): Promise<ShipmentsResponse> {
    const query = new URLSearchParams({ page: String(page) });
    if (orderId) {
      query.set("order-id", orderId);
    }
    return this.cachedRequest(
      `shipments:${page}:${orderId ?? ""}`,
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

  async handleReturn(returnId: string, data: HandleReturnRequest): Promise<ProcessStatus> {
    const result = await this.request<ProcessStatus>(
      `/returns/${encodeURIComponent(returnId)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    this.cache.invalidate(`return:${returnId}`);
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

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.cachedRequest(
      `invoice:${invoiceId}`,
      300_000,
      () => this.request<Invoice>(`/invoices/${encodeURIComponent(invoiceId)}`),
    );
  }

  // --- Commissions ---

  async getCommission(ean: string, condition: string, unitPrice: number): Promise<Commission> {
    const query = new URLSearchParams({
      ean,
      condition,
      "unit-price": String(unitPrice),
    });
    return this.cachedRequest(
      `commission:${ean}:${condition}:${unitPrice}`,
      300_000,
      () => this.request<Commission>(`/commission/${encodeURIComponent(ean)}?${query.toString()}`),
    );
  }

  // --- Process Status ---

  async getProcessStatus(processStatusId: string): Promise<ProcessStatus> {
    return this.request<ProcessStatus>(
      `/process-status/${encodeURIComponent(processStatusId)}`,
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
    const token = await this.authenticate();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/vnd.retailer.v10+json");
    if (init?.body) {
      headers.set("Content-Type", "application/vnd.retailer.v10+json");
    }

    const url = `${this.baseUrl}${path}`;
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
