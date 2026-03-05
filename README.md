# bol-mcp

[![npm version](https://img.shields.io/npm/v/bol-mcp.svg)](https://www.npmjs.com/package/bol-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)
[![CI](https://github.com/bartwaardenburg/bol-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/bartwaardenburg/bol-mcp/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/BartWaardenburg/b6fe43cfa36c0e461cc9dd5eea411dca/raw/bol-mcp-coverage.json)](https://bartwaardenburg.github.io/bol-mcp/)

A community-built [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [bol.com Retailer API](https://api.bol.com/retailer/public/Retailer-API/index.html). Manage orders, offers, shipments, returns, invoices, and commissions — all through natural language via any MCP-compatible AI client.

> **Note:** This is an unofficial, community-maintained project and is not affiliated with or endorsed by bol.com.

## Features

- **67 tools** across 16 categories covering the bol.com Retailer API v10
- **Order management** — list, inspect, and cancel orders with status and fulfilment filtering
- **Offer CRUD** — create, update, delete offers with price/stock management and export reports
- **Shipment handling** — create shipments with partial quantity support and invoice requests
- **Return processing** — list, inspect, create, and handle returns
- **Invoice access** — retrieve invoices by period with full UBL detail and specifications
- **Commission calculator** — single and bulk commission rates by EAN, condition, and price
- **Product catalog** — browse categories, search products, view competing offers, ratings, and assets
- **Product content** — manage catalog content, upload reports, and chunk recommendations
- **Insights** — offer visits, buy box %, performance indicators, product ranks, sales forecasts, and search terms
- **Inventory** — LVB/FBB inventory levels with filtering
- **Promotions** — list and inspect promotions and their products
- **Replenishments** — full FBB replenishment lifecycle: create, update, delivery dates, pickup slots, labels
- **Retailers** — retailer account information
- **Shipping labels** — delivery options and label creation
- **Subscriptions** — webhook/pubsub/SQS event subscriptions with signature key management
- **Transports** — update transport tracking information
- **OAuth2 authentication** with automatic token refresh
- **Input validation** via Zod schemas on every tool for safe, predictable operations
- **Response caching** with configurable TTL and automatic invalidation on writes
- **Rate limit handling** with exponential backoff and `Retry-After` header support
- **Toolset filtering** to expose only the tool categories you need
- **Docker support** for containerized deployment
- **Actionable error messages** with context-aware recovery suggestions

## Supported Clients

This MCP server works with any client that supports the Model Context Protocol, including:

| Client | Easiest install |
|---|---|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | One-liner: `claude mcp add` |
| [Codex CLI](https://github.com/openai/codex) (OpenAI) | One-liner: `codex mcp add` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) (Google) | One-liner: `gemini mcp add` |
| [VS Code](https://code.visualstudio.com/) (Copilot) | Command Palette: `MCP: Add Server` |
| [Claude Desktop](https://claude.ai/download) | JSON config file |
| [Cursor](https://cursor.com) | JSON config file |
| [Windsurf](https://codeium.com/windsurf) | JSON config file |
| [Cline](https://github.com/cline/cline) | UI settings |
| [Zed](https://zed.dev) | JSON settings file |

## Installation

### Claude Code

```bash
claude mcp add --scope user bol-mcp \
  --env BOL_CLIENT_ID=your-client-id \
  --env BOL_CLIENT_SECRET=your-client-secret \
  -- npx -y bol-mcp
```

### Codex CLI (OpenAI)

```bash
codex mcp add bol-mcp \
  --env BOL_CLIENT_ID=your-client-id \
  --env BOL_CLIENT_SECRET=your-client-secret \
  -- npx -y bol-mcp
```

### Gemini CLI (Google)

```bash
gemini mcp add bol-mcp -- npx -y bol-mcp
```

Set environment variables `BOL_CLIENT_ID` and `BOL_CLIENT_SECRET` separately via `~/.gemini/settings.json`.

### VS Code (Copilot)

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > `MCP: Add Server` > select **Command (stdio)**.

Or add to `.vscode/mcp.json` in your project directory:

```json
{
  "servers": {
    "bol-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "bol-mcp"],
      "env": {
        "BOL_CLIENT_ID": "your-client-id",
        "BOL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Claude Desktop / Cursor / Windsurf / Cline

These clients share the same JSON format. Add the config below to the appropriate file:

| Client | Config file |
|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor (project) | `.cursor/mcp.json` |
| Cursor (global) | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | Settings > MCP Servers > Edit |

```json
{
  "mcpServers": {
    "bol-mcp": {
      "command": "npx",
      "args": ["-y", "bol-mcp"],
      "env": {
        "BOL_CLIENT_ID": "your-client-id",
        "BOL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Zed

Add to your Zed settings (`~/.zed/settings.json` on macOS, `~/.config/zed/settings.json` on Linux):

```json
{
  "context_servers": {
    "bol-mcp": {
      "command": "npx",
      "args": ["-y", "bol-mcp"],
      "env": {
        "BOL_CLIENT_ID": "your-client-id",
        "BOL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Docker

```bash
docker run -i --rm \
  -e BOL_CLIENT_ID=your-client-id \
  -e BOL_CLIENT_SECRET=your-client-secret \
  ghcr.io/bartwaardenburg/bol-mcp
```

### Codex CLI (TOML config alternative)

If you prefer editing `~/.codex/config.toml` directly:

```toml
[mcp_servers.bol-mcp]
command = "npx"
args = ["-y", "bol-mcp"]
env = { "BOL_CLIENT_ID" = "your-client-id", "BOL_CLIENT_SECRET" = "your-client-secret" }
```

### Other MCP Clients

For any MCP-compatible client, use this server configuration:

- **Command:** `npx`
- **Args:** `["-y", "bol-mcp"]`
- **Environment variables:** `BOL_CLIENT_ID` and `BOL_CLIENT_SECRET`

## Configuration

### Required

| Variable | Description |
|---|---|
| `BOL_CLIENT_ID` | Your bol.com API client ID |
| `BOL_CLIENT_SECRET` | Your bol.com API client secret |

Generate your credentials in the [bol.com Partner Platform](https://partnerplatform.bol.com/) under **Settings > API Settings**.

### Optional

| Variable | Description | Default |
|---|---|---|
| `BOL_CACHE_TTL` | Response cache lifetime in seconds. Set to `0` to disable caching. | `120` |
| `BOL_MAX_RETRIES` | Maximum retry attempts for rate-limited (429) requests with exponential backoff. | `3` |
| `BOL_TOOLSETS` | Comma-separated list of tool categories to enable (see [Toolset Filtering](#toolset-filtering)). | All toolsets |

## Authentication

This server authenticates with the bol.com Retailer API using the **OAuth2 client credentials flow**. It automatically obtains and refreshes access tokens — you only need to provide your client ID and secret.

For full details, see the [official bol.com authentication documentation](https://api.bol.com/retailer/public/Retailer-API/authentication.html).

### Creating Your Credentials

1. Log in to the [bol.com Seller Dashboard](https://partnerplatform.bol.com/)
2. Navigate to **Settings** > **Services** > **API Settings**
3. Provide technical contact details (required before creating credentials)
4. Create a new API credential set
5. Copy the **Client ID** and **Client Secret**

### How It Works

The server exchanges your credentials for a short-lived access token via the bol.com token endpoint:

- **Endpoint:** `POST https://login.bol.com/token`
- **Auth:** HTTP Basic with `base64(clientId:clientSecret)`
- **Grant type:** `client_credentials`
- **Token lifetime:** ~5 minutes (299 seconds)

Tokens are automatically reused and refreshed before expiry — no manual token management required.

### Security Best Practices

- **Never share** your client ID or client secret, and don't hardcode them in source files
- **Use environment variables** to pass credentials (as shown in the installation examples)
- **Create separate credentials** for different applications or integrations
- **Revoke immediately** if credentials are compromised — removing them in the Seller Dashboard stops access instantly

## Available Tools

### Orders

| Tool | Description |
|---|---|
| `list_orders` | List orders with optional status and fulfilment method filtering |
| `get_order` | Get detailed order information by order ID |
| `cancel_order_items` | Cancel order items with a reason code |

### Offers

| Tool | Description |
|---|---|
| `get_offer` | Get offer details by offer ID |
| `create_offer` | Create a new offer (EAN, condition, price, stock, fulfilment method) |
| `update_offer` | Update offer details (reference, onHoldByRetailer, unknown product title, fulfilment) |
| `delete_offer` | Delete an offer permanently |
| `update_offer_price` | Update the pricing for an offer |
| `update_offer_stock` | Update the stock level for an offer |
| `request_offer_export` | Request a CSV export of all offers |
| `get_offer_export` | Download a previously requested offer export |
| `request_unpublished_offer_report` | Request a report of unpublished offers |
| `get_unpublished_offer_report` | Download a previously requested unpublished offer report |

### Shipments

| Tool | Description |
|---|---|
| `list_shipments` | List shipments with optional order ID and fulfilment method filtering |
| `get_shipment` | Get shipment details by shipment ID |
| `create_shipment` | Create a shipment for order items (supports partial quantities) |
| `get_shipment_invoice_requests` | List invoice requests for shipments |

### Returns

| Tool | Description |
|---|---|
| `list_returns` | List returns with optional handled status and fulfilment method filtering |
| `get_return` | Get return details by RMA ID |
| `handle_return` | Handle/process a return (accept, reject, repair, etc.) |
| `create_return` | Create a return for an order item |

### Invoices

| Tool | Description |
|---|---|
| `list_invoices` | List invoices by date period (max 31 days, format: YYYY-MM-DD) |
| `get_invoice` | Get full invoice details by invoice ID |
| `get_invoice_specification` | Get detailed invoice specification/line items |

### Commissions

| Tool | Description |
|---|---|
| `get_commission` | Calculate the commission for a product by EAN, condition, and unit price |
| `get_bulk_commissions` | Calculate commissions for multiple products at once |

### Products

| Tool | Description |
|---|---|
| `get_product_categories` | Browse product categories |
| `get_product_list` | Search and browse products by category or search term |
| `get_product_list_filters` | Get available product list filters |
| `get_product_assets` | Get product images and assets by EAN |
| `get_competing_offers` | Get competing offers for a product by EAN |
| `get_product_placement` | Get product placement information |
| `get_price_star_boundaries` | Get price star boundaries for a product |
| `get_product_ids` | Get product identifiers by EAN |
| `get_product_ratings` | Get product ratings and reviews |

### Product Content

| Tool | Description |
|---|---|
| `get_catalog_product` | Get catalog product details by EAN |
| `create_product_content` | Create or update product content |
| `get_upload_report` | Get product content upload report |
| `get_chunk_recommendations` | Get product content recommendations |

### Insights

| Tool | Description |
|---|---|
| `get_offer_insights` | Get offer visit and buy box insights |
| `get_performance_indicators` | Get retailer performance indicators |
| `get_product_ranks` | Get product search and browse rankings |
| `get_sales_forecast` | Get sales forecast for an offer |
| `get_search_terms` | Get search term volume data |

### Inventory

| Tool | Description |
|---|---|
| `get_inventory` | Get LVB/FBB inventory with filtering by stock level, state, and EAN |

### Promotions

| Tool | Description |
|---|---|
| `list_promotions` | List available promotions by type |
| `get_promotion` | Get promotion details |
| `get_promotion_products` | Get products in a promotion |

### Replenishments

| Tool | Description |
|---|---|
| `list_replenishments` | List FBB replenishments with filtering |
| `get_replenishment` | Get replenishment details |
| `create_replenishment` | Create a new FBB replenishment |
| `update_replenishment` | Update or cancel a replenishment |
| `get_delivery_dates` | Get available FBB delivery dates |
| `get_pickup_time_slots` | Get pickup time slots for a delivery date |
| `request_product_destinations` | Request product warehouse destinations |
| `get_product_destinations` | Get product warehouse destinations |

### Retailers

| Tool | Description |
|---|---|
| `get_retailer_information` | Get retailer account information |

### Shipping Labels

| Tool | Description |
|---|---|
| `get_delivery_options` | Get available shipping/delivery options for order items |
| `create_shipping_label` | Create a shipping label for order items |

### Subscriptions

| Tool | Description |
|---|---|
| `list_subscriptions` | List all event subscriptions |
| `get_subscription` | Get subscription details |
| `create_subscription` | Create an event subscription (webhook, GCP Pub/Sub, or AWS SQS) |
| `update_subscription` | Update an event subscription |
| `delete_subscription` | Delete an event subscription |
| `test_subscription` | Send a test notification to a subscription |
| `get_signature_keys` | Get public keys for webhook signature validation |

### Transports

| Tool | Description |
|---|---|
| `update_transport` | Update transport/tracking information |

## Toolset Filtering

Reduce context window usage by enabling only the tool categories you need. Set the `BOL_TOOLSETS` environment variable to a comma-separated list:

```bash
BOL_TOOLSETS=orders,offers
```

| Toolset | Tools included |
|---|---|
| `orders` | Order listing, details, and cancellation |
| `offers` | Full offer CRUD, price/stock management, export reports |
| `shipments` | Shipment listing, details, creation, and invoice requests |
| `returns` | Return listing, details, creation, and handling |
| `invoices` | Invoice listing, details, and specifications |
| `commissions` | Single and bulk commission calculation |
| `products` | Product categories, search, assets, competing offers, ratings, placement |
| `product-content` | Catalog products, content creation, upload reports, recommendations |
| `insights` | Offer insights, performance indicators, product ranks, sales forecasts, search terms |
| `inventory` | LVB/FBB inventory levels |
| `promotions` | Promotion listing and product details |
| `replenishments` | FBB replenishment lifecycle, delivery dates, pickup slots, destinations |
| `retailers` | Retailer account information |
| `shipping-labels` | Delivery options and shipping label creation |
| `subscriptions` | Event subscription management and signature keys |
| `transports` | Transport tracking updates |

When not set, all toolsets are enabled. Invalid names are ignored; if all names are invalid, all toolsets are enabled as a fallback.

## Example Usage

Once connected, you can interact with the bol.com API using natural language:

- "List all my open orders"
- "Show me the details of order 1234567890"
- "Create an offer for EAN 9781234567890 at 19.99 EUR with 50 units in stock"
- "Update the stock for offer abc-123 to 25 units"
- "Ship order items for order 1234567890 with transport code TNT"
- "Show me all unhandled returns"
- "What's the commission on EAN 9781234567890 at 29.99 EUR?"
- "List my invoices for January 2025"

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
src/
  index.ts              # Entry point (stdio transport)
  server.ts             # MCP server setup and toolset filtering
  bol-client.ts         # bol.com API HTTP client with OAuth2, caching, and retry
  cache.ts              # TTL-based in-memory response cache
  types.ts              # TypeScript interfaces for bol.com API v10
  tool-result.ts        # Error formatting with recovery suggestions
  update-checker.ts     # NPM update notifications
  tools/
    orders.ts           # Order listing, details, and cancellation
    offers.ts           # Offer CRUD, pricing, stock, and export reports
    shipments.ts        # Shipment listing, details, creation, and invoices
    returns.ts          # Return listing, details, creation, and handling
    invoices.ts         # Invoice listing, details, and specifications
    commissions.ts      # Single and bulk commission calculation
    products.ts         # Product catalog, search, competing offers, ratings
    product-content.ts  # Catalog content management and recommendations
    insights.ts         # Offer insights, performance, ranks, forecasts
    inventory.ts        # LVB/FBB inventory management
    promotions.ts       # Promotion listing and products
    replenishments.ts   # FBB replenishment lifecycle
    retailers.ts        # Retailer account information
    shipping-labels.ts  # Delivery options and label creation
    subscriptions.ts    # Event subscription management
    transports.ts       # Transport tracking updates
```

## Requirements

- Node.js >= 20
- A [bol.com](https://bol.com) seller account with API credentials

## License

MIT - see [LICENSE](LICENSE) for details.
