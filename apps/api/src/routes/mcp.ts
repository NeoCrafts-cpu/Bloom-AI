import type { FastifyInstance } from "fastify";
import { listMCPTools, executeMCPTool } from "../mcp/server.js";

export async function mcpRouter(app: FastifyInstance) {
  /** List all available MCP tools for agent discovery */
  app.get("/tools", async () => {
    return { data: listMCPTools() };
  });

  /** Execute a specific MCP tool */
  app.post<{
    Body: { tool: string; input?: Record<string, unknown> };
  }>("/execute", async (req, reply) => {
    const { tool, input } = req.body;
    if (!tool) {
      return reply.code(400).send({ error: "tool name required" });
    }
    const result = await executeMCPTool(tool, input ?? {});
    if (!result.success) {
      return reply.code(400).send({ error: result.error });
    }
    return { data: result.result };
  });
}
