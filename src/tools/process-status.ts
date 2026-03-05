import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const EVENT_TYPES = [
  "CREATE_SHIPMENT",
  "CANCEL_ORDER",
  "CHANGE_TRANSPORT",
  "HANDLE_RETURN_ITEM",
  "CREATE_RETURN_ITEM",
  "CREATE_INBOUND",
  "DELETE_OFFER",
  "CREATE_OFFER",
  "UPDATE_OFFER",
  "UPDATE_OFFER_STOCK",
  "UPDATE_OFFER_PRICE",
  "CREATE_OFFER_EXPORT",
  "UNPUBLISHED_OFFER_REPORT",
  "CREATE_PRODUCT_CONTENT",
  "CREATE_SUBSCRIPTION",
  "UPDATE_SUBSCRIPTION",
  "DELETE_SUBSCRIPTION",
  "SEND_SUBSCRIPTION_TST_MSG",
  "CREATE_SHIPPING_LABEL",
  "CREATE_REPLENISHMENT",
  "UPDATE_REPLENISHMENT",
  "REQUEST_PRODUCT_DESTINATIONS",
  "CREATE_SOV_SEARCH_TERM_REPORT",
  "CREATE_SOV_CATEGORY_REPORT",
  "UPLOAD_INVOICE",
  "CREATE_CAMPAIGN_PERFORMANCE_REPORT",
] as const;

export const registerProcessStatusTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "get_process_status",
    {
      title: "Get Process Status",
      description:
        "Get the status of an asynchronous process by its process status ID. " +
        "All PUT/POST/DELETE requests return a process status ID that can be used here to check completion.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        processStatusId: z.string().min(1).describe("The process status ID returned by a previous request."),
      }),
    },
    async ({ processStatusId }) => {
      try {
        const result = await client.getProcessStatus(processStatusId);

        return toTextResult(
          [
            `Process status: ${result.processStatusId}`,
            `Status: ${result.status}`,
            result.entityId ? `Entity ID: ${result.entityId}` : null,
            result.eventType ? `Event type: ${result.eventType}` : null,
            result.description ? `Description: ${result.description}` : null,
            result.errorMessage ? `Error: ${result.errorMessage}` : null,
            result.createTimestamp ? `Created: ${result.createTimestamp}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_process_status_by_entity",
    {
      title: "Get Process Status by Entity",
      description:
        "Get the status of asynchronous processes by entity ID and event type. " +
        "The entity ID can be an order item ID, transport ID, return number, replenishment ID, etc. " +
        "Results are returned in descending order.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        entityId: z.string().min(1).describe("The entity ID (e.g. order item ID, transport ID, return number)."),
        eventType: z.enum(EVENT_TYPES).describe("The event type associated with the entity."),
        page: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Page number (50 items per page). Defaults to 1."),
      }),
    },
    async ({ entityId, eventType, page }) => {
      try {
        const result = await client.getProcessStatusByEntityId(entityId, eventType, page);
        const statuses = result.processStatuses ?? [];

        if (statuses.length === 0) {
          return toTextResult("No process statuses found for this entity and event type.", result as Record<string, unknown>);
        }

        const lines = statuses.map(
          (ps) =>
            `${ps.processStatusId}: ${ps.status}${ps.description ? ` — ${ps.description}` : ""}${ps.errorMessage ? ` (Error: ${ps.errorMessage})` : ""}`,
        );

        return toTextResult(
          [`Found ${statuses.length} process status(es):`, ...lines].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_process_status_bulk",
    {
      title: "Get Process Status (Bulk)",
      description:
        "Get the status of multiple asynchronous processes by their process status IDs. " +
        "Up to 1000 IDs can be queried in a single request.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        processStatusIds: z
          .array(z.string().min(1))
          .min(1)
          .max(1000)
          .describe("Array of process status IDs to look up (max 1000)."),
      }),
    },
    async ({ processStatusIds }) => {
      try {
        const result = await client.getProcessStatusBulk(processStatusIds);
        const statuses = result.processStatuses ?? [];

        if (statuses.length === 0) {
          return toTextResult("No process statuses found for the given IDs.", result as Record<string, unknown>);
        }

        const lines = statuses.map(
          (ps) =>
            `${ps.processStatusId}: ${ps.status}${ps.description ? ` — ${ps.description}` : ""}${ps.errorMessage ? ` (Error: ${ps.errorMessage})` : ""}`,
        );

        return toTextResult(
          [`Found ${statuses.length} process status(es):`, ...lines].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
