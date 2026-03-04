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

- **17 tools** across 6 categories covering the bol.com Retailer API v10
- **Order management** — list and inspect orders with status and fulfilment filtering
- **Offer CRUD** — create, update, delete offers with price and stock management
- **Shipment handling** — create shipments with partial quantity support
- **Return processing** — list, inspect, and handle returns by RMA ID
- **Invoice access** — retrieve invoices by period with full UBL detail
- **Commission calculator** — look up commission rates by EAN, condition, and price
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

## API Key Setup

### Creating Your Credentials

1. Log in to the [bol.com Partner Platform](https://partnerplatform.bol.com/)
2. Navigate to **Settings** > **API Settings**
3. Create a new API credential set
4. Copy the **Client ID** and **Client Secret**

The server uses OAuth2 client credentials flow — it automatically obtains and refreshes access tokens using your client ID and secret.

## Available Tools

### Orders

| Tool | Description |
|---|---|
| `list_orders` | List orders with optional status and fulfilment method filtering |
| `get_order` | Get detailed order information by order ID |

### Offers

| Tool | Description |
|---|---|
| `get_offer` | Get offer details by offer ID |
| `create_offer` | Create a new offer (EAN, condition, price, stock, fulfilment method) |
| `update_offer` | Update offer details (reference, onHoldByRetailer, unknown product title, fulfilment) |
| `delete_offer` | Delete an offer permanently |
| `update_offer_price` | Update the pricing for an offer |
| `update_offer_stock` | Update the stock level for an offer |

### Shipments

| Tool | Description |
|---|---|
| `list_shipments` | List shipments with optional order ID and fulfilment method filtering |
| `get_shipment` | Get shipment details by shipment ID |
| `create_shipment` | Create a shipment for order items (supports partial quantities) |

### Returns

| Tool | Description |
|---|---|
| `list_returns` | List returns with optional handled status and fulfilment method filtering |
| `get_return` | Get return details by RMA ID |
| `handle_return` | Handle/process a return (accept, reject, repair, etc.) |

### Invoices

| Tool | Description |
|---|---|
| `list_invoices` | List invoices by date period (max 31 days, format: YYYY-MM-DD) |
| `get_invoice` | Get full invoice details by invoice ID |

### Commissions

| Tool | Description |
|---|---|
| `get_commission` | Calculate the commission for a product by EAN, condition, and unit price |

## Toolset Filtering

Reduce context window usage by enabling only the tool categories you need. Set the `BOL_TOOLSETS` environment variable to a comma-separated list:

```bash
BOL_TOOLSETS=orders,offers
```

| Toolset | Tools included |
|---|---|
| `orders` | Order listing and details |
| `offers` | Full offer CRUD, price and stock management |
| `shipments` | Shipment listing, details, and creation |
| `returns` | Return listing, details, and handling |
| `invoices` | Invoice listing and details |
| `commissions` | Commission calculation |

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
    orders.ts           # Order listing and details
    offers.ts           # Offer CRUD, pricing, and stock management
    shipments.ts        # Shipment listing, details, and creation
    returns.ts          # Return listing, details, and handling
    invoices.ts         # Invoice listing and details
    commissions.ts      # Commission calculation
```

## Requirements

- Node.js >= 20
- A [bol.com](https://bol.com) seller account with API credentials

## License

MIT - see [LICENSE](LICENSE) for details.
