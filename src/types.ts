// --- Orders ---

export interface ShipmentDetails {
  salutation?: string;
  firstName?: string;
  surname?: string;
  streetName?: string;
  houseNumber?: string;
  houseNumberExtension?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  company?: string;
  deliveryPhoneNumber?: string;
  language?: string;
}

export interface BillingDetails {
  salutation?: string;
  firstName?: string;
  surname?: string;
  streetName?: string;
  houseNumber?: string;
  houseNumberExtension?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  email?: string;
  company?: string;
  vatNumber?: string;
  kvkNumber?: string;
  orderReference?: string;
}

export interface OrderItem {
  orderItemId: string;
  offerReference?: string;
  ean: string;
  title?: string;
  quantity: number;
  offerPrice: number;
  offerCondition?: string;
  cancelRequest?: boolean;
  fulfilmentMethod: string;
  fulfilmentStatus?: string;
  selectedDeliveryWindow?: {
    startDateTime?: string;
    endDateTime?: string;
  };
  latestDeliveryDate?: string;
  exactDeliveryDate?: string;
  expiryDate?: string;
}

export interface Order {
  orderId: string;
  pickupPoint?: boolean;
  dateTimeOrderPlaced?: string;
  orderItems: OrderItem[];
  shipmentDetails?: ShipmentDetails;
  billingDetails?: BillingDetails;
  [key: string]: unknown;
}

export interface OrdersResponse {
  orders: Order[];
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
  pickUpPoints?: boolean;
}

export interface Store {
  productTitle?: string;
  visible?: {
    status: string;
  }[];
}

export interface Offer {
  offerId: string;
  ean: string;
  reference?: string;
  onHoldByRetailer: boolean;
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
  condition: Condition;
  reference?: string;
  onHoldByRetailer?: boolean;
  unknownProductTitle?: string;
  pricing: Pricing;
  stock: Stock;
  fulfilment: Fulfilment;
}

export interface UpdateOfferRequest {
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

// --- Shipments ---

export interface ShipmentItem {
  orderItemId: string;
  orderId: string;
}

export interface Transport {
  transportId?: string;
  transporterCode?: string;
  trackAndTrace?: string;
  shippingLabelId?: string;
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
  orderItems: { orderItemId: string }[];
  shipmentReference?: string;
  shippingLabelId?: string;
  transport?: {
    transporterCode: string;
    trackAndTrace?: string;
  };
}

// --- Returns ---

export interface ReturnItem {
  returnItemId?: string;
  rmaId?: string;
  orderId: string;
  orderItemId: string;
  ean: string;
  title?: string;
  expectedQuantity: number;
  returnReason?: {
    mainReason: string;
    detailedReason?: string;
    customerComments?: string;
  };
  trackAndTrace?: string;
  transporterName?: string;
  handled?: boolean;
  processingResults?: {
    quantity: number;
    processingResult: string;
    handlingResult: string;
    processingDateTime?: string;
  }[];
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

// --- Invoices ---

export interface InvoicePeriod {
  startDate: string;
  endDate: string;
}

export interface Invoice {
  invoiceId: string;
  invoiceMediaType?: string;
  [key: string]: unknown;
}

export interface InvoicesResponse {
  invoices: Invoice[];
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
