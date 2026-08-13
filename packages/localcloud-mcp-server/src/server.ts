import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { productFacts } from './data/localcloudFacts.js';
import {
  diagnosticsInputShape,
  docsInputShape,
  gcpClientInputShape,
  handleDiagnostics,
  handleDocs,
  handleGcpClient,
  handleLogs,
  handleRuntime,
  handleServices,
  handleState,
  logsInputShape,
  runtimeInputShape,
  servicesInputShape,
  stateInputShape,
} from './tools.js';

interface PromptCapableServer {
  registerPrompt: (
    name: string,
    config: { title: string; description: string; argsSchema?: Record<string, z.ZodTypeAny> },
    handler: (args: Record<string, string | undefined>) => { messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }> },
  ) => void;
}

const promptText = (kind: string, service: string | undefined, language: string | undefined) => {
  const serviceLine = service ? ` Focus on ${service}.` : '';
  const languageLine = language ? ` Use ${language} examples where useful.` : '';
  const base = 'Use LocalCloud as a local Google Cloud emulator. Do not ask for or use real GCP credentials, service-account keys, billing projects, or production endpoints. Point SDKs and Terraform at localhost, stop on routing uncertainty, and validate against real Google Cloud only before production after unsetting emulator variables.';
  return `${base}${serviceLine}${languageLine}\n\nTask: ${kind}\nRead https://local.cloud/ai/agents.md, https://local.cloud/services/, https://local.cloud/compatibility/, and the relevant docs under https://local.cloud/docs/ before making changes.`;
};

export function createLocalCloudMcpServer(): McpServer {
  const server = new McpServer({ name: 'localcloud-mcp-server', version: '0.1.0' });

  server.registerTool(
    'localcloud-runtime',
    {
      title: 'LocalCloud runtime',
      description: `Inspect and manage the ${productFacts.dockerImage} LocalCloud container. Stop/restart require confirm: true.`,
      inputSchema: runtimeInputShape,
    },
    handleRuntime,
  );
  server.registerTool(
    'localcloud-services',
    {
      title: 'LocalCloud services',
      description: 'List service metadata, ports, protocols, SDK environment variables, supported behavior, and known gaps.',
      inputSchema: servicesInputShape,
    },
    handleServices,
  );
  server.registerTool(
    'localcloud-diagnostics',
    {
      title: 'LocalCloud diagnostics',
      description: 'Check Docker availability, container state, ports, health, emulator env vars, and SDK routing pitfalls.',
      inputSchema: diagnosticsInputShape,
    },
    handleDiagnostics,
  );
  server.registerTool(
    'localcloud-logs',
    {
      title: 'LocalCloud logs',
      description: 'Read bounded LocalCloud container logs in summary, errors, requests, or raw modes.',
      inputSchema: logsInputShape,
    },
    handleLogs,
  );
  server.registerTool(
    'localcloud-state',
    {
      title: 'LocalCloud state',
      description: 'Inspect LocalCloud container/admin state. Reset is disabled by default and requires confirm: true plus LOCALCLOUD_MCP_ENABLE_STATE_RESET=1.',
      inputSchema: stateInputShape,
    },
    handleState,
  );
  server.registerTool(
    'localcloud-docs',
    {
      title: 'LocalCloud docs',
      description: 'Return canonical local.cloud documentation links, service docs, safety boundaries, and copyable prompts.',
      inputSchema: docsInputShape,
    },
    handleDocs,
  );
  server.registerTool(
    'localcloud-gcp-client',
    {
      title: 'Constrained local gcloud planner',
      description: 'Return a dry-run plan for allowlisted gcloud groups. Execution stays disabled until runtime-generated gcloud endpoint overrides can be validated safely.',
      inputSchema: gcpClientInputShape,
    },
    handleGcpClient,
  );

  const prompts = server as unknown as PromptCapableServer;
  const argsSchema = { service: z.string().optional(), language: z.string().optional() };
  prompts.registerPrompt('gcp-sandbox-tester', { title: 'GCP sandbox tester', description: 'Plan and run a safe LocalCloud sandbox validation.', argsSchema }, ({ service, language }) => ({ messages: [{ role: 'user', content: { type: 'text', text: promptText('test a GCP integration locally with LocalCloud and report the exact localhost evidence', service, language) } }] }));
  prompts.registerPrompt('write-localcloud-integration-test', { title: 'Write LocalCloud integration test', description: 'Create a no-mock integration test that targets LocalCloud.', argsSchema }, ({ service, language }) => ({ messages: [{ role: 'user', content: { type: 'text', text: promptText('write the narrowest integration test that uses LocalCloud instead of mocks or real GCP', service, language) } }] }));
  prompts.registerPrompt('terraform-local-gcp-validation', { title: 'Terraform LocalCloud validation', description: 'Validate Terraform against LocalCloud endpoint overrides.', argsSchema }, ({ service, language }) => ({ messages: [{ role: 'user', content: { type: 'text', text: promptText('configure Terraform endpoint overrides for LocalCloud and run only local validation', service, language) } }] }));
  prompts.registerPrompt('debug-localcloud-sdk-routing', { title: 'Debug SDK routing', description: 'Find why an SDK or Terraform workflow is escaping localhost.', argsSchema }, ({ service, language }) => ({ messages: [{ role: 'user', content: { type: 'text', text: promptText('debug SDK or Terraform routing and prove it is using localhost, not real Google Cloud', service, language) } }] }));

  return server;
}
