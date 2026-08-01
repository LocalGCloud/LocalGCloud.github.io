#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLocalCloudMcpServer } from './server.js';

export { createLocalCloudMcpServer } from './server.js';
export {
  diagnosticsInputSchema,
  docsInputSchema,
  gcpClientInputSchema,
  handleDiagnostics,
  handleDocs,
  handleGcpClient,
  handleLogs,
  handleRuntime,
  handleServices,
  handleState,
  logsInputSchema,
  runtimeInputSchema,
  servicesInputSchema,
  stateInputSchema,
  validateGcpClientArgs,
} from './tools.js';

export async function runStdioServer(): Promise<void> {
  const server = createLocalCloudMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[localcloud-mcp-server] stdio transport connected; protocol messages use stdout, logs use stderr.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStdioServer().catch((error: unknown) => {
    console.error('[localcloud-mcp-server] fatal', error);
    process.exitCode = 1;
  });
}
