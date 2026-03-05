import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

const SubscriptionTypeEnum = z.enum(["WEBHOOK", "GCP_PUBSUB", "AWS_SQS"]);

export const registerSubscriptionTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "list_subscriptions",
    {
      title: "List Subscriptions",
      description:
        "List all event subscriptions. Shows configured webhooks, GCP Pub/Sub, and AWS SQS subscriptions.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({}),
    },
    async () => {
      try {
        const response = await client.getSubscriptions();
        const subscriptions = response.subscriptions ?? [];

        if (subscriptions.length === 0) {
          return toTextResult("No subscriptions found.");
        }

        return toTextResult(
          [
            `Subscriptions (${subscriptions.length}):`,
            ...subscriptions.map((sub: Record<string, unknown>) =>
              [
                `  - ${sub.id}`,
                sub.subscriptionType ? `    Type: ${sub.subscriptionType}` : null,
                sub.url ? `    URL: ${sub.url}` : null,
                sub.enabled !== undefined ? `    Enabled: ${sub.enabled}` : null,
                sub.resources && Array.isArray(sub.resources) ? `    Resources: ${sub.resources.join(", ")}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          { subscriptions } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_subscription",
    {
      title: "Get Subscription Details",
      description:
        "Get detailed information about a specific event subscription.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({
        subscriptionId: z.string().min(1).describe("The subscription ID."),
      }),
    },
    async ({ subscriptionId }) => {
      try {
        const sub = await client.getSubscription(subscriptionId);

        return toTextResult(
          [
            `Subscription: ${sub.id}`,
            sub.subscriptionType ? `Type: ${sub.subscriptionType}` : null,
            sub.url ? `URL: ${sub.url}` : null,
            sub.enabled !== undefined ? `Enabled: ${sub.enabled}` : null,
            sub.identity ? `Identity: ${sub.identity}` : null,
            sub.resources && Array.isArray(sub.resources) ? `Resources: ${sub.resources.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          sub as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_subscription",
    {
      title: "Create Subscription",
      description:
        "Create a new event subscription. Subscribe to events like PROCESS_STATUS, SHIPMENT, PRICE_STAR_BOUNDARY, COMPETING_OFFER, OFFER_FOR_SALE, OFFER_NOT_FOR_SALE. " +
        "Supports WEBHOOK, GCP_PUBSUB, and AWS_SQS subscription types.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        resources: z
          .array(
            z.enum([
              "PROCESS_STATUS",
              "SHIPMENT",
              "PRICE_STAR_BOUNDARY",
              "COMPETING_OFFER",
              "OFFER_FOR_SALE",
              "OFFER_NOT_FOR_SALE",
            ]),
          )
          .min(1)
          .describe("Event types to subscribe to."),
        url: z.string().min(1).describe("The endpoint URL for receiving notifications."),
        subscriptionType: SubscriptionTypeEnum.describe("Subscription type: WEBHOOK, GCP_PUBSUB, or AWS_SQS."),
        enabled: z.boolean().optional().default(true).describe("Whether the subscription is enabled. Defaults to true."),
        identity: z.string().optional().describe("AWS ARN for AWS_SQS subscriptions."),
      }),
    },
    async ({ resources, url, subscriptionType, enabled, identity }) => {
      try {
        const data = {
          resources,
          url,
          subscriptionType,
          ...(enabled !== undefined ? { enabled } : {}),
          ...(identity !== undefined ? { identity } : {}),
        };
        const result = await client.createSubscription(data);

        return toTextResult(
          [
            `Subscription created`,
            `Process status: ${result.processStatusId} (${result.status})`,
            result.entityId ? `Subscription ID: ${result.entityId}` : null,
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
    "update_subscription",
    {
      title: "Update Subscription",
      description:
        "Update an existing event subscription. You can change the resources, URL, type, enabled status, and identity.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        subscriptionId: z.string().min(1).describe("The subscription ID to update."),
        resources: z
          .array(
            z.enum([
              "PROCESS_STATUS",
              "SHIPMENT",
              "PRICE_STAR_BOUNDARY",
              "COMPETING_OFFER",
              "OFFER_FOR_SALE",
              "OFFER_NOT_FOR_SALE",
            ]),
          )
          .min(1)
          .describe("Event types to subscribe to."),
        url: z.string().min(1).describe("The endpoint URL for receiving notifications."),
        subscriptionType: SubscriptionTypeEnum.describe("Subscription type: WEBHOOK, GCP_PUBSUB, or AWS_SQS."),
        enabled: z.boolean().optional().describe("Whether the subscription is enabled."),
        identity: z.string().optional().describe("AWS ARN for AWS_SQS subscriptions."),
      }),
    },
    async ({ subscriptionId, resources, url, subscriptionType, enabled, identity }) => {
      try {
        const data = {
          resources,
          url,
          subscriptionType,
          ...(enabled !== undefined ? { enabled } : {}),
          ...(identity !== undefined ? { identity } : {}),
        };
        const result = await client.updateSubscription(subscriptionId, data);

        return toTextResult(
          [
            `Subscription ${subscriptionId} update initiated`,
            `Process status: ${result.processStatusId} (${result.status})`,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "delete_subscription",
    {
      title: "Delete Subscription",
      description:
        "Delete an event subscription. This permanently removes the subscription — it cannot be undone. " +
        "Always confirm with the user before calling this tool.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },

      inputSchema: z.object({
        subscriptionId: z.string().min(1).describe("The subscription ID to delete."),
      }),
    },
    async ({ subscriptionId }) => {
      try {
        const result = await client.deleteSubscription(subscriptionId);

        return toTextResult(
          [
            `Subscription ${subscriptionId} deletion initiated`,
            `Process status: ${result.processStatusId} (${result.status})`,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "test_subscription",
    {
      title: "Test Subscription",
      description:
        "Send a test notification to a subscription endpoint. Use this to verify that your subscription is correctly configured.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        subscriptionId: z.string().min(1).describe("The subscription ID to test."),
      }),
    },
    async ({ subscriptionId }) => {
      try {
        const result = await client.testSubscription(subscriptionId);

        return toTextResult(
          [
            `Test notification sent for subscription ${subscriptionId}`,
            `Process status: ${result.processStatusId} (${result.status})`,
          ].join("\n"),
          result as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_signature_keys",
    {
      title: "Get Signature Keys",
      description:
        "Get the public keys used for webhook signature validation. Use these to verify that incoming webhook notifications are from bol.com.",
      annotations: { readOnlyHint: true, openWorldHint: true },

      inputSchema: z.object({}),
    },
    async () => {
      try {
        const keys = await client.getSignatureKeys();
        const signatureKeys = keys.signatureKeys ?? [];

        if (signatureKeys.length === 0) {
          return toTextResult("No signature keys found.");
        }

        return toTextResult(
          [
            `Signature Keys (${signatureKeys.length}):`,
            ...signatureKeys.map((key: Record<string, unknown>) =>
              [
                `  - ID: ${key.id ?? "unknown"}`,
                key.type ? `    Type: ${key.type}` : null,
                key.publicKey ? `    Public Key: ${key.publicKey}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ].join("\n"),
          keys as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
