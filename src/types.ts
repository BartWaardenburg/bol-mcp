// --- Orders ---

export interface ShipmentDetails {
  salutation?: string;
  firstName?: string;
  surname?: string;
  streetName?: string;
  houseNumber?: string;
  houseNumberExtension?: string;
  extraAddressInformation?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  company?: string;
  deliveryPhoneNumber?: string;
  language?: string;
  pickupPointName?: string;
}

export interface BillingDetails {
  salutation?: string;
  firstName?: string;
  surname?: string;
  streetName?: string;
  houseNumber?: string;
  houseNumberExtension?: string;
  extraAddressInformation?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  company?: string;
  vatNumber?: string;
  kvkNumber?: string;
  orderReference?: string;
}

export interface OrderItemFulfilment {
  method: string;
  distributionParty?: string;
  latestDeliveryDate?: string;
  exactDeliveryDate?: string;
  expiryDate?: string;
  timeFrameType?: string;
}

export interface OrderItemOffer {
  offerId?: string;
  reference?: string;
}

export interface OrderItemProduct {
  ean?: string;
  title?: string;
}

export interface OrderItemDiscount {
  title?: string;
  amount?: number;
}

export interface OrderItem {
  orderItemId: string;
  cancellationRequest?: boolean;
  fulfilment: OrderItemFulfilment;
  offer?: OrderItemOffer;
  product?: OrderItemProduct;
  quantity: number;
  quantityShipped?: number;
  quantityCancelled?: number;
  unitPrice?: number;
  totalPrice?: number;
  commission?: number;
  discounts?: OrderItemDiscount[];
  additionalServices?: { serviceType: string }[];
  latestChangedDateTime?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  ean?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  title?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  offerPrice?: number;
  /** @deprecated v9 flat field — kept for backward compatibility */
  offerCondition?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  offerReference?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  fulfilmentMethod?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  fulfilmentStatus?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  latestDeliveryDate?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  exactDeliveryDate?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  expiryDate?: string;
  /** @deprecated v9 flat field — kept for backward compatibility */
  cancelRequest?: boolean;
  selectedDeliveryWindow?: {
    startDateTime?: string;
    endDateTime?: string;
  };
}

export interface Order {
  orderId: string;
  pickupPoint?: boolean;
  orderPlacedDateTime?: string;
  orderItems: OrderItem[];
  shipmentDetails?: ShipmentDetails;
  billingDetails?: BillingDetails;
  [key: string]: unknown;
}

export interface OrdersResponse {
  orders: Order[];
}

export interface OrderItemCancellation {
  orderItemId: string;
  reasonCode: string;
}

export interface CancellationRequest {
  orderItems: OrderItemCancellation[];
}

// --- Offers ---

export interface Pricing {
  bundlePrices: BundlePrice[];
}

export interface BundlePrice {
  quantity: number;
  unitPrice: number;
}

export interface Stock {
  amount: number;
  correctedStock?: number;
  managedByRetailer: boolean;
}

export interface Condition {
  name: string;
  category?: string;
  comment?: string;
}

export interface Fulfilment {
  method: string;
  deliveryCode?: string;
}

export interface OffersCountryCode {
  countryCode: string;
}

export interface Store {
  productTitle?: string;
  visible?: OffersCountryCode[];
}

export interface Offer {
  offerId: string;
  ean: string;
  reference?: string;
  onHoldByRetailer: boolean;
  economicOperatorId?: string;
  unknownProductTitle?: string;
  pricing: Pricing;
  stock: Stock;
  fulfilment: Fulfilment;
  store?: Store;
  condition?: Condition;
  notPublishableReasons?: { code: string; description: string }[];
  [key: string]: unknown;
}

export interface CreateOfferRequest {
  ean: string;
  economicOperatorId?: string;
  condition: Condition;
  reference?: string;
  onHoldByRetailer?: boolean;
  unknownProductTitle?: string;
  pricing: Pricing;
  stock: Stock;
  fulfilment: Fulfilment;
}

export interface UpdateOfferRequest {
  economicOperatorId?: string;
  reference?: string;
  onHoldByRetailer?: boolean;
  unknownProductTitle?: string;
  fulfilment?: Fulfilment;
}

export interface UpdateOfferPriceRequest {
  pricing: Pricing;
}

export interface UpdateOfferStockRequest {
  amount: number;
  managedByRetailer: boolean;
}

export interface CreateOfferExportRequest {
  format: string;
}

export interface CreateUnpublishedOfferReportRequest {
  format: string;
}

// --- Shipments ---

export interface ShipmentFulfilment {
  method: string;
  distributionParty?: string;
  latestDeliveryDate?: string;
}

export interface ShipmentItem {
  orderItemId: string;
  fulfilment?: ShipmentFulfilment;
  offer?: OrderItemOffer;
  product?: OrderItemProduct;
  quantity?: number;
  quantityShipped?: number;
  unitPrice?: number;
  commission?: number;
}

export interface TransportEvent {
  eventCode?: string;
  eventDateTime?: string;
}

export interface Transport {
  transportId?: string;
  transporterCode?: string;
  trackAndTrace?: string;
  shippingLabelId?: string;
  transportEvents?: TransportEvent[];
}

export interface ShipmentOrder {
  orderId: string;
  orderPlacedDateTime?: string;
}

export interface Shipment {
  shipmentId: string;
  shipmentDateTime?: string;
  shipmentReference?: string;
  pickupPoint?: boolean;
  order?: ShipmentOrder;
  shipmentDetails?: ShipmentDetails;
  billingDetails?: BillingDetails;
  shipmentItems?: ShipmentItem[];
  transport?: Transport;
  [key: string]: unknown;
}

export interface ShipmentsResponse {
  shipments: Shipment[];
}

export interface CreateShipmentRequest {
  orderItems: { orderItemId: string; quantity?: number }[];
  shipmentReference?: string;
  shippingLabelId?: string;
  transport?: {
    transporterCode: string;
    trackAndTrace?: string;
  };
}

export interface InvoiceRequestsResponse {
  invoiceRequests?: {
    shipmentId: string;
    orderId?: string;
    status: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

// --- Returns ---

export interface ReturnReason {
  mainReason: string;
  detailedReason?: string;
  customerComments?: string;
}

export interface ReturnProcessingResult {
  quantity: number;
  processingResult: string;
  handlingResult: string;
  processingDateTime?: string;
}

export interface CustomerDetails {
  salutation?: string;
  firstName?: string;
  surname?: string;
  streetName?: string;
  houseNumber?: string;
  houseNumberExtension?: string;
  extraAddressInformation?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  deliveryPhoneNumber?: string;
  company?: string;
  vatNumber?: string;
}

export interface ReturnItem {
  rmaId?: string;
  orderId: string;
  ean: string;
  title?: string;
  expectedQuantity: number;
  returnReason?: ReturnReason;
  trackAndTrace?: string;
  transporterName?: string;
  handled?: boolean;
  processingResults?: ReturnProcessingResult[];
  customerDetails?: CustomerDetails;
}

export interface Return {
  returnId: string;
  registrationDateTime?: string;
  fulfilmentMethod?: string;
  returnItems: ReturnItem[];
  [key: string]: unknown;
}

export interface ReturnsResponse {
  returns: Return[];
}

export interface HandleReturnRequest {
  handlingResult: string;
  quantityReturned: number;
}

export interface CreateReturnRequest {
  orderItemId: string;
  quantityReturned: number;
  handlingResult: string;
}

// --- Invoices ---

export interface InvoicePeriod {
  startDate: string;
  endDate: string;
}

export interface LegalMonetaryTotal {
  lineExtensionAmount?: number;
  payableAmount?: number;
  taxExclusiveAmount?: number;
  taxInclusiveAmount?: number;
}

export interface InvoiceListItem {
  invoiceId: string;
  invoiceType?: string;
  issueDate?: string;
  invoicePeriod?: InvoicePeriod;
  legalMonetaryTotal?: LegalMonetaryTotal;
  invoiceMediaTypes?: string[];
  specificationMediaTypes?: string[];
}

export interface Invoice {
  invoiceId: string;
  invoiceMediaType?: string;
  [key: string]: unknown;
}

export interface InvoicesResponse {
  invoiceListItems?: InvoiceListItem[];
  period?: string;
  /** @deprecated kept for backward compat if API ever returns this key */
  invoices?: Invoice[];
}

export interface InvoiceSpecificationResponse {
  [key: string]: unknown;
}

// --- Commissions ---

export interface Commission {
  ean: string;
  condition: string;
  unitPrice: number;
  fixedAmount: number;
  percentage: number;
  totalCost: number;
  totalCostWithoutReduction?: number;
  reductions?: {
    maximumPrice: number;
    costReduction: number;
    startDate: string;
    endDate: string;
  }[];
  [key: string]: unknown;
}

export interface BulkCommissionQuery {
  ean: string;
  unitPrice: number;
  condition?: string;
}

export interface BulkCommissionRequest {
  commissionQueries: BulkCommissionQuery[];
}

export interface BulkCommissionResponse {
  commissions?: Commission[];
  [key: string]: unknown;
}

export interface CommissionProductsRequest {
  products: { ean: string }[];
}

export interface CommissionRange {
  lower: number;
  upper?: number;
}

export interface CommissionPriceRange {
  range: CommissionRange;
  fixedAmount: number;
  percentage: number;
  reductionApplied: boolean;
}

export interface CommissionDateRate {
  condition: string;
  priceRanges: CommissionPriceRange[];
}

export interface CommissionDateRange {
  startDate: string;
  endDate: string;
  rates: CommissionDateRate[];
}

export interface CommissionRate {
  ean: string;
  dateRanges: CommissionDateRange[];
}

export interface CommissionSuccessfulQuery {
  index: number;
  status: number;
  commissionRates: CommissionRate[];
}

export interface CommissionFailedQuery {
  index: number;
  status: number;
  violations: { name: string; reason: string }[];
}

export interface BulkCommissionRatesResponse {
  successfulQueries: CommissionSuccessfulQuery[];
  failedQueries: CommissionFailedQuery[];
}

// --- Process Status ---

export interface ProcessStatus {
  processStatusId: string;
  entityId?: string;
  eventType?: string;
  description?: string;
  status: string;
  errorMessage?: string;
  createTimestamp?: string;
  links?: { rel: string; href: string; method: string }[];
  [key: string]: unknown;
}

export interface ProcessStatusResponse {
  processStatuses: ProcessStatus[];
  [key: string]: unknown;
}

export interface BulkProcessStatusRequest {
  processStatusQueries: { processStatusId: string }[];
}

export type ProcessStatusEventType =
  | "CREATE_SHIPMENT"
  | "CANCEL_ORDER"
  | "CHANGE_TRANSPORT"
  | "HANDLE_RETURN_ITEM"
  | "CREATE_RETURN_ITEM"
  | "CREATE_INBOUND"
  | "DELETE_OFFER"
  | "CREATE_OFFER"
  | "UPDATE_OFFER"
  | "UPDATE_OFFER_STOCK"
  | "UPDATE_OFFER_PRICE"
  | "CREATE_OFFER_EXPORT"
  | "UNPUBLISHED_OFFER_REPORT"
  | "CREATE_PRODUCT_CONTENT"
  | "CREATE_SUBSCRIPTION"
  | "UPDATE_SUBSCRIPTION"
  | "DELETE_SUBSCRIPTION"
  | "SEND_SUBSCRIPTION_TST_MSG"
  | "CREATE_SHIPPING_LABEL"
  | "CREATE_REPLENISHMENT"
  | "UPDATE_REPLENISHMENT"
  | "REQUEST_PRODUCT_DESTINATIONS"
  | "CREATE_SOV_SEARCH_TERM_REPORT"
  | "CREATE_SOV_CATEGORY_REPORT"
  | "UPLOAD_INVOICE"
  | "CREATE_CAMPAIGN_PERFORMANCE_REPORT";

// --- Products ---

export interface ProductCategoriesResponse {
  categories?: {
    categoryId: string;
    categoryName?: string;
    order?: number;
    subcategories?: Record<string, unknown>[];
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface ProductListRequest {
  countryCode?: string;
  categoryId?: string;
  searchTerm?: string;
  filterRanges?: { rangeId: string; min: number; max: number }[];
  filterValues?: { filterValueId: string }[];
  sort?: string;
  page?: number;
}

export interface ProductListResponse {
  products?: {
    title?: string;
    eans?: { ean: string }[];
    [key: string]: unknown;
  }[];
  sort?: string;
  [key: string]: unknown;
}

export interface ProductListFiltersResponse {
  categoryData?: {
    categoryName?: string;
    categoryValues?: { categoryValueId?: string; categoryValueName?: string }[];
  };
  filterRanges?: {
    rangeId?: string;
    rangeName?: string;
    min?: number;
    max?: number;
    unit?: string;
  }[];
  filters?: {
    filterName?: string;
    filterValues?: { filterValueId?: string; filterValueName?: string }[];
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface ProductAssetsResponse {
  assets?: {
    usage?: string;
    order?: number;
    variants?: {
      size?: string;
      width?: number;
      height?: number;
      mimeType?: string;
      url?: string;
    }[];
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface CompetingOffersResponse {
  offers?: {
    offerId?: string;
    retailerId?: string;
    countryCode?: string;
    bestOffer?: boolean;
    price?: number;
    fulfilmentMethod?: string;
    condition?: string;
    ultimateOrderTime?: string;
    minDeliveryDate?: string;
    maxDeliveryDate?: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface ProductPlacementResponse {
  url?: string;
  categories?: {
    categoryId?: string;
    categoryName?: string;
    subcategories?: { id?: string; name?: string }[];
  }[];
  [key: string]: unknown;
}

export interface PriceStarBoundaries {
  lastModifiedDateTime?: string;
  priceStarBoundaryLevels?: { level: number; boundaryPrice: number }[];
  [key: string]: unknown;
}

export interface ProductIdsResponse {
  bolProductId?: string;
  eans?: {
    ean: string;
  }[];
  [key: string]: unknown;
}

export interface ProductRatingsResponse {
  ratings?: {
    rating: number;
    count?: number;
  }[];
  [key: string]: unknown;
}

// --- Product Content ---

export interface CatalogProduct {
  published?: boolean;
  gpc?: { chunkId: string };
  enrichment?: { status: number };
  attributes?: { id: string; values: { value: string; unitId?: string; valueId?: string }[] }[];
  parties?: { name: string; type: string; role: string }[];
  audioTracks?: Record<string, unknown>[];
  series?: { name?: string }[];
  [key: string]: unknown;
}

export interface CreateProductContentRequest {
  language: string;
  attributes: { id: string; values: { value: string; unitId?: string }[] }[];
  assets?: { url: string; labels: string[] }[];
}

export interface UploadReportResponse {
  uploadId?: string;
  language?: string;
  status?: string;
  attributes?: {
    id: string;
    values: { value: string; unitId?: string }[];
    status: string;
    subStatus?: string;
    subStatusDescription?: string;
  }[];
  assets?: {
    url: string;
    labels: string[];
    status: string;
    subStatus?: string;
    subStatusDescription?: string;
  }[];
  [key: string]: unknown;
}

export interface ChunkRecommendationsRequest {
  productContents: {
    attributes: {
      id: string;
      values: { value: string }[];
    }[];
  }[];
}

export interface ChunkRecommendationsResponse {
  recommendations?: {
    predictions?: {
      chunkId: string;
      probability: number;
    }[];
  }[];
  [key: string]: unknown;
}

// --- Insights ---

export interface OfferInsightsResponse {
  offerInsights?: {
    name?: string;
    type?: string;
    total?: number;
    countries?: { countryCode?: string; value?: number }[];
    periods?: {
      period?: { day?: number; week?: number; month?: number; year?: number };
      total?: number;
      countries?: { countryCode?: string; value?: number }[];
    }[];
  }[];
  [key: string]: unknown;
}

export interface PerformanceIndicatorsResponse {
  performanceIndicators?: {
    name?: string;
    type?: string;
    details?: {
      period?: { week?: string; year?: string };
      score?: {
        conforms?: boolean;
        numerator?: number;
        denominator?: number;
        value?: number;
        distanceToNorm?: number;
      };
      norm?: {
        condition?: string;
        value?: number;
      };
    };
  }[];
  [key: string]: unknown;
}

export interface ProductRanksResponse {
  ranks?: {
    categoryId?: string;
    searchTerm?: string;
    wasSponsored?: boolean;
    rank?: number;
    impressions?: number;
  }[];
  hasNextPage?: boolean;
  [key: string]: unknown;
}

export interface SalesForecastResponse {
  name?: string;
  type?: string;
  total?: {
    minimum?: number;
    maximum?: number;
  };
  countries?: {
    countryCode?: string;
    minimum?: number;
    maximum?: number;
  }[];
  periods?: {
    weeksAhead?: number;
    total?: { minimum?: number; maximum?: number };
    countries?: { countryCode?: string; minimum?: number; maximum?: number }[];
  }[];
  [key: string]: unknown;
}

export interface SearchTermsResponse {
  searchTerms?: {
    searchTerm?: string;
    type?: string;
    total?: number;
    countries?: { countryCode?: string; value?: number }[];
    periods?: {
      period?: { day?: string; week?: string; month?: string; year?: string };
      total?: number;
      countries?: { countryCode?: string; value?: number }[];
    }[];
    relatedSearchTerms?: {
      searchTerm?: string;
      total?: number;
    }[];
  };
  [key: string]: unknown;
}

// --- Inventory ---

export interface InventoryResponse {
  inventory?: {
    ean?: string;
    bsku?: string;
    gradedStock?: number;
    regularStock?: number;
    title?: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

// --- Promotions ---

export interface PromotionsResponse {
  promotions?: {
    promotionId?: string;
    title?: string;
    startDateTime?: string;
    endDateTime?: string;
    countries?: { countryCode?: string }[];
    promotionType?: string;
    retailerSpecificPromotion?: boolean;
    campaign?: {
      name?: string;
      startDateTime?: string;
      endDateTime?: string;
    };
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface PromotionResponse {
  promotionId?: string;
  title?: string;
  startDateTime?: string;
  endDateTime?: string;
  countries?: { countryCode?: string }[];
  promotionType?: string;
  retailerSpecificPromotion?: boolean;
  campaign?: {
    name?: string;
    startDateTime?: string;
    endDateTime?: string;
  };
  [key: string]: unknown;
}

export interface PromotionProductsResponse {
  products?: {
    ean?: string;
    relevanceScores?: { countryCode?: string; relevanceScore?: number }[];
    maximumPrice?: number;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

// --- Replenishments ---

export interface ReplenishmentsResponse {
  replenishments?: {
    replenishmentId?: string;
    reference?: string;
    creationDateTime?: string;
    lines?: { ean?: string }[];
    invalidLines?: { type?: string }[];
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface ReplenishmentResponse {
  replenishmentId?: string;
  creationDateTime?: string;
  reference?: string;
  labelingByBol?: boolean;
  state?: string;
  deliveryInformation?: {
    expectedDeliveryDate?: string;
    transporterCode?: string;
    destinationWarehouse?: Record<string, unknown>;
  };
  pickupAppointment?: Record<string, unknown>;
  numberOfLoadCarriers?: number;
  loadCarriers?: {
    sscc?: string;
    transportLabelTrackAndTrace?: string;
    transportState?: string;
    transportStateUpdateDateTime?: string;
  }[];
  lines?: {
    ean?: string;
    lineState?: string;
    quantityAnnounced?: number;
    quantityReceived?: number;
    quantityInProgress?: number;
    quantityWithGradedState?: number;
    quantityWithRegularState?: number;
    [key: string]: unknown;
  }[];
  invalidLines?: {
    type?: string;
    quantityAnnounced?: number;
    quantityReceived?: number;
    [key: string]: unknown;
  }[];
  stateTransitions?: {
    state?: string;
    stateDateTime?: string;
  }[];
  [key: string]: unknown;
}

export interface CreateReplenishmentRequest {
  reference: string;
  deliveryInfo?: {
    expectedDeliveryDate: string;
    transporterCode: string;
  };
  labelingByBol: boolean;
  numberOfLoadCarriers: number;
  pickupAppointment?: {
    address: {
      streetName: string;
      houseNumber: string;
      zipCode: string;
      houseNumberExtension?: string;
      city: string;
      countryCode: string;
      attentionOf: string;
    };
    pickupTimeSlot: {
      fromDateTime: string;
      untilDateTime: string;
    };
    commentToTransporter?: string;
  };
  lines: { ean: string; quantity: number }[];
}

export interface UpdateReplenishmentRequest {
  state?: string;
  deliveryInfo?: { expectedDeliveryDate: string };
  numberOfLoadCarriers?: number;
  loadCarriers?: { sscc: string }[];
}

export interface DeliveryDatesResponse {
  deliveryDates?: string[];
  [key: string]: unknown;
}

export interface PickupTimeSlotsAddress {
  streetName: string;
  houseNumber: string;
  houseNumberExtension?: string;
  zipCode: string;
  city: string;
  countryCode: string;
}

export interface PickupTimeSlotsRequest {
  address: PickupTimeSlotsAddress;
  numberOfLoadCarriers: number;
}

export interface PickupTimeSlotsResponse {
  timeSlots?: {
    fromDateTime?: string;
    untilDateTime?: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

export interface RequestProductDestinationsRequest {
  eans: { ean: string }[];
}

export interface ProductDestinationsResponse {
  productDestinations?: {
    destinationWarehouse?: {
      address?: Record<string, unknown>;
    };
    eans?: { ean: string }[];
  }[];
  [key: string]: unknown;
}

export interface ProductLabelsProduct {
  ean: string;
  quantity: number;
}

export interface ProductLabelsRequest {
  labelFormat: string;
  products: ProductLabelsProduct[];
}

// --- Retailers ---

export interface RetailerInformationResponse {
  retailerId?: string;
  displayName?: string;
  companyName?: string;
  vatNumber?: string;
  kvkNumber?: string;
  registrationDate?: string;
  topRetailer?: boolean;
  ratingMethod?: string;
  retailerRating?: {
    retailerRating?: number;
    productInformationRating?: number;
    deliveryTimeRating?: number;
    shippingRating?: number;
    serviceRating?: number;
  };
  retailerReview?: {
    totalReviewCount?: number;
    approvalPercentage?: number;
    positiveReviewCount?: number;
    neutralReviewCount?: number;
    negativeReviewCount?: number;
  };
  [key: string]: unknown;
}

// --- Shipping Labels ---

export interface ShippingLabelRequest {
  orderItems: { orderItemId: string; quantity?: number }[];
  shippingLabelOfferId: string;
}

export interface DeliveryOptionsRequest {
  orderItems: { orderItemId: string; quantity?: number }[];
}

export interface DeliveryOptionsResponse {
  deliveryOptions?: {
    shippingLabelOfferId?: string;
    recommended?: boolean;
    validUntilDate?: string;
    transporterCode?: string;
    labelType?: string;
    labelDisplayName?: string;
    labelPrice?: { totalPrice?: number };
    packageRestrictions?: {
      maxWeight?: string;
      maxDimensions?: string;
    };
    handoverDetails?: {
      meetsCustomerExpectation?: boolean;
      earliestHandoverDateTime?: string;
      latestHandoverDateTime?: string;
      collectionMethod?: string;
    };
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}

// --- Subscriptions ---

export interface SubscriptionsResponse {
  subscriptions?: SubscriptionResponse[];
  [key: string]: unknown;
}

export interface SubscriptionResponse {
  id?: string;
  resources?: string[];
  url?: string;
  subscriptionType?: string;
  enabled?: boolean;
  identity?: string;
  [key: string]: unknown;
}

export interface SubscriptionRequest {
  resources: string[];
  url: string;
  subscriptionType: string;
  enabled?: boolean;
  identity?: string;
}

export interface KeySetResponse {
  signatureKeys?: {
    id?: string;
    type?: string;
    publicKey?: string;
  }[];
  [key: string]: unknown;
}

// --- Transports ---

export interface ChangeTransportRequest {
  transporterCode?: string;
  trackAndTrace: string;
}
