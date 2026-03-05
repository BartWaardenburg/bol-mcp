# bol-mcp

[![npm version](https://img.shields.io/npm/v/bol-mcp.svg)](https://www.npmjs.com/package/bol-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)
[![CI](https://github.com/bartwaardenburg/bol-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/bartwaardenburg/bol-mcp/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/BartWaardenburg/b6fe43cfa36c0e461cc9dd5eea411dca/raw/bol-mcp-coverage.json)](https://bartwaardenburg.github.io/bol-mcp/)

A community-built [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [bol.com Retailer API](https://api.bol.com/retailer/public/Retailer-API/index.html). Manage orders, offers, shipments, returns, invoices, and commissions — all through natural language via any MCP-compatible AI client.

> **Note:** This is an unofficial, community-maintained project and is not affiliated with or endorsed by bol.com.

## Quick Start (Non-Developers)

You do not need to clone this repo.

1. Make sure Node.js 20+ is installed (your AI app will run `npx` on your machine)
2. Get bol.com API credentials (see [Authentication](#authentication))
3. Add the server to your AI app as an MCP server (copy/paste config below)
4. Ask in plain language (see [Example Usage](#example-usage))

### Add To Claude Desktop (Also Works In Cowork)

Cowork runs inside Claude Desktop and uses the same connected MCP servers and permissions.

1. Open your Claude Desktop MCP config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
2. Add this server entry (or merge it into your existing `mcpServers`):

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

3. Restart Claude Desktop

### Add To Other AI Apps

Most MCP apps have a screen like "Add MCP Server" where you can fill in:

- Command: `npx`
- Args: `-y bol-mcp`
- Env: `BOL_CLIENT_ID=your-client-id` and `BOL_CLIENT_SECRET=your-client-secret`

If your app wants JSON, paste this and adapt the top-level key name to your client (common ones are `mcpServers`, `servers`, or `context_servers`):

```json
{
  "<servers-key>": {
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

### Troubleshooting

- Error: `Missing required env vars: BOL_CLIENT_ID, BOL_CLIENT_SECRET`
  - Fix: add both env vars to the MCP server config and restart your app.
- Error: `npx: command not found` or server fails to start
  - Fix: install Node.js 20+ and restart your app.
- You can connect, but API calls fail with `401/403`
  - Fix: verify client ID/secret are correct and active in the bol.com Seller Dashboard.

## API Coverage

bol.com exposes several APIs for different purposes. This MCP server covers the **Retailer API v10** and the **Shared API** — the core APIs for marketplace sellers managing their day-to-day operations.

| API | Status | Description |
|---|---|---|
| **Retailer API v10** | Covered | Core seller operations: orders, offers, shipments, returns, invoices, commissions, products, inventory, promotions, replenishments, subscriptions, and more |
| **Shared API v10** | Covered | Cross-API utilities for tracking asynchronous process statuses |
| **Offer API v11** | Not covered | Next-generation offer management (v11 successor to the Retailer API offer endpoints) |
| **Advertiser API v11** | Not covered | Sponsored product campaigns, ad groups, keywords, budgets, and performance reporting |
| **Economic Operators API** | Not covered | Economic operator information and regulatory compliance data |

> The Retailer API v10 offer endpoints included in this MCP are fully functional. The Offer API v11 is a newer version with an updated endpoint structure — support may be added in a future release.

## Features

- **76 tools** across 17 categories covering the bol.com Retailer API v10
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
- **Process status** — track asynchronous operations by ID, entity, or in bulk
- **OAuth2 authentication** with automatic token refresh
- **Input validation** via Zod schemas on every tool for safe, predictable operations
- **Response caching** with configurable TTL and automatic invalidation on writes
- **Rate limit handling** with exponential backoff and `Retry-After` header support
- **Toolset filtering** to expose only the tool categories you need
- **Docker support** for containerized deployment
- **Actionable error messages** with context-aware recovery suggestions

## Supported Clients

<details>
<summary><strong>Advanced setup and supported clients (expand)</strong></summary>

This MCP server is not tied to one coding agent. It works with any MCP-compatible client or agent runtime that can start a stdio MCP server.

| Client / runtime | Docs |
|---|---|
| Claude Code | [MCP in Claude Code](https://docs.anthropic.com/en/docs/claude-code/mcp) |
| Anthropic API (Messages API) | [Remote MCP servers](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers) |
| Codex CLI (OpenAI) | [Codex CLI docs](https://developers.openai.com/codex/cli) |
| Gemini CLI (Google) | [Gemini CLI MCP server docs](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html) |
| VS Code (Copilot) | [Use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) |
| Claude Desktop | [MCP in Claude Desktop](https://docs.anthropic.com/en/docs/claude-desktop/mcp) |
| Cursor | [Cursor docs](https://cursor.com/docs) |
| Windsurf | [Windsurf MCP docs](https://docs.windsurf.com/windsurf/cascade/mcp) |
| Cline | [Cline MCP docs](https://docs.cline.bot/mcp/) |
| Zed | [Zed context servers docs](https://zed.dev/docs/assistant/context-servers) |
| Any other MCP host | Use command/args/env from [Generic MCP Server Config](#generic-mcp-server-config) |

### Claude Ecosystem Notes

Claude currently has multiple MCP-related concepts that are easy to mix up:

- **Local MCP servers (Claude Desktop):** defined in `claude_desktop_config.json` and started on your machine ([docs](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)).
- **Cowork:** reuses the MCP servers connected in Claude Desktop ([docs](https://support.claude.com/en/articles/13345190-get-started-with-cowork)).
- **Connectors:** remote MCP integrations managed in Claude ([docs](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities)).
- **Cowork plugins:** Claude-specific workflow packaging (instructions + tools/data integrations) ([docs](https://support.claude.com/en/articles/13837440-use-plugins-in-cowork)). Useful in Claude, but not portable as a generic MCP server config for other agent clients.

Verified against vendor docs on **2026-03-05**.

## Setup (Power Users)

If Quick Start worked in your client, you can skip this section. These are additional per-client setup options and CLI one-liners.

### Generic MCP Server Config

Use this as the baseline in any host:

- **Command:** `npx`
- **Args:** `["-y", "bol-mcp"]`
- **Required env vars:** `BOL_CLIENT_ID`, `BOL_CLIENT_SECRET`
- **Optional env vars:** `BOL_CACHE_TTL`, `BOL_MAX_RETRIES`, `BOL_TOOLSETS` (see [Configuration](#configuration))

Minimal JSON (adapt the top-level key to your host):

```json
{
  "<servers-key>": {
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

Host key mapping:

| Host | Top-level key | Notes |
|---|---|---|
| VS Code | `servers` | Add `"type": "stdio"` on the server object |
| Claude Desktop / Cursor / Windsurf / Cline | `mcpServers` | Same command/args/env block |
| Zed | `context_servers` | Same command/args/env block |
| Codex CLI (TOML) | `mcp_servers` | Uses TOML, shown below |

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

`~/.codex/config.toml` alternative:

```toml
[mcp_servers.bol-mcp]
command = "npx"
args = ["-y", "bol-mcp"]
env = { "BOL_CLIENT_ID" = "your-client-id", "BOL_CLIENT_SECRET" = "your-client-secret" }
```

### Gemini CLI (Google)

```bash
gemini mcp add bol-mcp -- npx -y bol-mcp
```

Set `BOL_CLIENT_ID` and `BOL_CLIENT_SECRET` in `~/.gemini/settings.json`.

### VS Code (Copilot)

Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > `MCP: Add Server` > **Command (stdio)**, or use `.vscode/mcp.json` with top-level key `servers` and the canonical command/args/env block from [Generic MCP Server Config](#generic-mcp-server-config).

### Claude Desktop + Cowork / Cursor / Windsurf / Cline / Zed

Cowork runs inside Claude Desktop and uses the same connected MCP servers and permissions. Configure once in Claude Desktop, then the server is available in Cowork.

Use the canonical config block and place it in the host file below with the matching top-level key.

| Client | Config location | Top-level key |
|---|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` | `mcpServers` |
| Claude Desktop (Windows) | `%APPDATA%\\Claude\\claude_desktop_config.json` | `mcpServers` |
| Cursor (project) | `.cursor/mcp.json` | `mcpServers` |
| Cursor (global) | `~/.cursor/mcp.json` | `mcpServers` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| Cline | MCP settings UI | `mcpServers` |
| Zed (macOS/Linux) | `~/.zed/settings.json` or `~/.config/zed/settings.json` | `context_servers` |

### Docker

```bash
docker run -i --rm \
  -e BOL_CLIENT_ID=your-client-id \
  -e BOL_CLIENT_SECRET=your-client-secret \
  ghcr.io/bartwaardenburg/bol-mcp
```

### Other MCP Clients

Use the values from [Generic MCP Server Config](#generic-mcp-server-config).

## Terminology

What is portable across hosts:

- MCP server runtime settings (`command`, `args`, `env`)
- Transport model (`stdio` command server)
- Tool names and tool schemas exposed by this server

What is host/vendor-specific (not portable as-is):

- Host config key names (`servers`, `mcpServers`, `context_servers`, `mcp_servers`)
- Host UX/workflows for adding servers (CLI commands, UI menus, settings paths)
- Anthropic-specific concepts such as [Claude Desktop local MCP servers](https://docs.anthropic.com/en/docs/claude-desktop/mcp), [Claude Connectors via remote MCP](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers), and [Claude Code plugins](https://docs.anthropic.com/en/docs/claude-code/plugins) used in Cowork workflows

## Security Notes

- **Trust model:** Any prompt or agent allowed to call this MCP server can execute bol.com API actions with the configured credentials.
- **Least-privilege credentials:** Use separate bol.com API credentials per environment/team/use case and rotate/revoke when access changes.
- **Write-action approvals:** Enable host-side approvals for mutating tools (`create_*`, `update_*`, `delete_*`, `cancel_*`, `handle_return`, shipment/replenishment actions).
- **Team config governance:** Keep shared MCP config in version control, require review for changes to command/args/env/toolset filtering, and keep secrets in a vault or host secret manager (not in plain-text repo files).

</details>

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

See [Security Notes](#security-notes). bol.com-specific credential hygiene:

- Never share your client ID or client secret, and don't hardcode them in source files
- Use environment variables or host secret stores to pass credentials
- Revoke and replace credentials immediately if compromise is suspected

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

### Process Status

| Tool | Description |
|---|---|
| `get_process_status` | Get the status of an asynchronous process by process status ID |
| `get_process_status_by_entity` | Get process statuses by entity ID and event type |
| `get_process_status_bulk` | Get the status of multiple processes by their IDs (up to 1000) |

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
| `process-status` | Asynchronous process status tracking (by ID, entity, or bulk) |

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

## Community

- Support: [SUPPORT.md](SUPPORT.md)
- Security reporting: [SECURITY.md](SECURITY.md)
- Contributing guidelines: [CONTRIBUTING.md](CONTRIBUTING.md)
- Bug reports and feature requests: [Issues](https://github.com/bartwaardenburg/bol-mcp/issues)

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
    process-status.ts   # Asynchronous process status tracking
```

## Requirements

- Node.js >= 20
- A [bol.com](https://bol.com) seller account with API credentials

## License

MIT - see [LICENSE](LICENSE) for details.
