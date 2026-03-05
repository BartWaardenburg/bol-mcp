import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { BolClient } from "../bol-client.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerTransportTools = (server: McpServer, client: BolClient): void => {
  server.registerTool(
    "update_transport",
    {
      title: "Update Transport",
      description:
        "Update transport/tracking information for a shipment. Provide a track and trace code and optionally a transporter code. " +
        "Returns a process status — the update is applied asynchronously. Use get_process_status to check completion.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },

      inputSchema: z.object({
        transportId: z.string().min(1).describe("The transport ID to update."),
        trackAndTrace: z.string().min(1).describe("Track and trace code from the transporter."),
        transporterCode: z
          .string()
          .optional()
          .describe("Transporter code (e.g. 'TNT', 'DHL', 'POSTNL', 'DPD', 'BPOST_BE')."),
      }),
    },
    async ({ transportId, trackAndTrace, transporterCode }) => {
      try {
        const result = await client.updateTransport(transportId, {
          trackAndTrace,
          ...(transporterCode ? { transporterCode } : {}),
        });

        return toTextResult(
          [
            `Transport ${transportId} update initiated`,
            `Track & Trace: ${trackAndTrace}`,
            transporterCode ? `Transporter: ${transporterCode}` : null,
            `Process status: ${result.processStatusId} (${result.status})`,
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
};
