#!/usr/bin/env node

/**
 * CLI Entrypoint for IBM Bob MCP Server (stdio transport)
 *
 * Usage:
 *   node src/mcp/cli.js
 *   npm run mcp:start
 *
 * Compatible with IBM Bob CLI, Claude Desktop, Cursor, and any MCP client.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('[IBM Bob MCP] SupplyShield L2 MCP Server running on stdio transport.');
  console.error('[IBM Bob MCP] Ready to receive tool requests from IBM Bob CLI / MCP client.');
}

main().catch((err) => {
  console.error('[IBM Bob MCP Fatal Error]', err);
  process.exit(1);
});
