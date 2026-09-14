/**
 * IBM Bob MCP Server Definition
 *
 * Exposes SupplyShield L2 operations as standard Model Context Protocol (MCP) tools:
 * - Compatible with IBM Bob CLI, Claude Desktop, Cursor, and any MCP client.
 * - Dispatches tool calls to live Supabase database and deterministic engines.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, executeTool } from './tools.js';

export function createMcpServer() {
  const server = new Server(
    {
      name: 'bob-supplyshield-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Execute requested tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeTool(name, args || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message}`,
          },
        ],
      };
    }
  });

  return server;
}
