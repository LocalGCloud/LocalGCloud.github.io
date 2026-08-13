import { z } from 'zod';
import { agenticFacts, docsCorpus, localcloudServices, productFacts, promptLibrary } from './data/localcloudFacts.js';
import { checkPort, dockerAvailable, inspectContainer, inspectState, logs, restartContainer, startContainer, stopContainer } from './lib/docker.js';
import { fetchJson, waitForHealth } from './lib/http.js';
import { jsonResult, refusal, truncateText, type ToolResult } from './lib/result.js';

export const runtimeInputShape = {
  action: z.enum(['status', 'health', 'start', 'stop', 'restart', 'readiness']).default('status'),
  confirm: z.boolean().optional().describe('Required for destructive stop and restart actions.'),
  image: z.string().default(agenticFacts.dockerImage).describe('Docker image to start; defaults to the reviewed mutable jaysen2apache/localcloud:latest identity. Pin a qualified digest for release workflows.'),
  containerName: z.string().default(agenticFacts.containerName),
  waitTimeoutMs: z.number().int().min(1_000).max(120_000).default(30_000),
};
export const runtimeInputSchema = z.object(runtimeInputShape);

export const servicesInputShape = {
  status: z.enum(['supported', 'partial', 'release-unverified', 'planned', 'all']).default('all'),
  service: z.string().optional().describe('Service slug or case-insensitive name substring.'),
  includeGaps: z.boolean().default(true),
};
export const servicesInputSchema = z.object(servicesInputShape);

export const diagnosticsInputShape = {
  includeEnv: z.boolean().default(true),
  ports: z.array(z.number().int().min(1).max(65_535)).default([24080, 24081, 24082, 24083, 24084, 24085, 24086, 24087, 24088, 24089, 24090, 24091, 24092]),
};
export const diagnosticsInputSchema = z.object(diagnosticsInputShape);

export const logsInputShape = {
  mode: z.enum(['summary', 'errors', 'requests', 'raw']).default('summary'),
  service: z.string().optional(),
  tailLines: z.number().int().min(1).max(2_000).default(200),
  maxBytes: z.number().int().min(1_024).max(128_000).default(16_384),
  containerName: z.string().default(agenticFacts.containerName),
};
export const logsInputSchema = z.object(logsInputShape);

export const stateInputShape = {
  action: z.enum(['inspect', 'reset']).default('inspect'),
  confirm: z.boolean().optional().describe('Required for reset.'),
  containerName: z.string().default(agenticFacts.containerName),
  resetEndpoint: z.string().url().default('http://localhost:24080/reset'),
};
export const stateInputSchema = z.object(stateInputShape);

export const docsInputShape = {
  topic: z.string().optional().describe('Topic or service name to search.'),
  includePrompts: z.boolean().default(false),
  limit: z.number().int().min(1).max(20).default(8),
};
export const docsInputSchema = z.object(docsInputShape);

export const gcpClientInputShape = {
  args: z.array(z.string()).min(1).max(24).describe('gcloud argv tokens, excluding the gcloud binary.'),
  execute: z.boolean().default(false).describe('Execution is unavailable until runtime-generated gcloud endpoint overrides are safely validated.'),
  project: z.string().default(agenticFacts.defaultProject),
};
export const gcpClientInputSchema = z.object(gcpClientInputShape);

const destructiveRuntimeActions: Record<string, true> = { stop: true, restart: true };
const envVarName = (assignment: string) => assignment.split('=')[0] ?? assignment;
const serviceMatches = (needle: string, service: { name: string; slug: string }) => {
  const normalized = needle.toLowerCase();
  return service.slug.includes(normalized) || service.name.toLowerCase().includes(normalized);
};

export async function handleRuntime(input: z.input<typeof runtimeInputSchema>): Promise<ToolResult> {
  const args = runtimeInputSchema.parse(input);
  if (destructiveRuntimeActions[args.action] && args.confirm !== true) {
    return refusal(`localcloud-runtime ${args.action} is destructive and requires confirm: true.`, {
      action: args.action,
      confirmRequired: true,
    });
  }

  const docker = await dockerAvailable();
  const container = docker.available ? await inspectContainer(args.containerName) : { exists: false, running: false };
  if (args.action === 'status') {
    return jsonResult({ ok: true, docker: { available: docker.available }, container, facts: agenticFacts });
  }
  if (args.action === 'health') {
    const health = await fetchJson(agenticFacts.healthEndpoint);
    return jsonResult({ ok: health.ok, health, container }, { isError: !health.ok });
  }
  if (args.action === 'readiness') {
    const readiness = await waitForHealth(agenticFacts.healthEndpoint, { timeoutMs: args.waitTimeoutMs });
    return jsonResult({ ok: readiness.ready, readiness, container }, { isError: !readiness.ready });
  }
  if (!docker.available) {
    return refusal('Docker is not available, so LocalCloud cannot be started or managed.', { docker: docker.result });
  }
  if (args.action === 'start') {
    const started = await startContainer(args.containerName, args.image);
    const readiness = started.exitCode === 0 ? await waitForHealth(agenticFacts.healthEndpoint, { timeoutMs: args.waitTimeoutMs }) : undefined;
    return jsonResult({ ok: started.exitCode === 0, command: { command: started.command, args: started.args, exitCode: started.exitCode }, stdout: started.stdout, stderr: started.stderr, readiness }, { isError: started.exitCode !== 0 });
  }
  if (args.action === 'stop') {
    const stopped = await stopContainer(args.containerName);
    return jsonResult({ ok: stopped.exitCode === 0, command: { command: stopped.command, args: stopped.args, exitCode: stopped.exitCode }, stdout: stopped.stdout, stderr: stopped.stderr }, { isError: stopped.exitCode !== 0 });
  }
  const restarted = await restartContainer(args.containerName);
  const readiness = restarted.exitCode === 0 ? await waitForHealth(agenticFacts.healthEndpoint, { timeoutMs: args.waitTimeoutMs }) : undefined;
  return jsonResult({ ok: restarted.exitCode === 0, command: { command: restarted.command, args: restarted.args, exitCode: restarted.exitCode }, stdout: restarted.stdout, stderr: restarted.stderr, readiness }, { isError: restarted.exitCode !== 0 });
}

export async function handleServices(input: z.input<typeof servicesInputSchema>): Promise<ToolResult> {
  const args = servicesInputSchema.parse(input);
  const services = localcloudServices
    .filter((service) => args.status === 'all' || service.status === args.status)
    .filter((service) => (args.service ? serviceMatches(args.service, service) : true))
    .map((service) => (args.includeGaps ? service : { ...service, gaps: [] }));
  return jsonResult({ ok: true, count: services.length, serviceCountLabel: productFacts.serviceCountLabel, services, source: 'Synchronized snapshot from src/data/agenticFacts.ts.' });
}

export async function handleDiagnostics(input: z.input<typeof diagnosticsInputSchema>): Promise<ToolResult> {
  const args = diagnosticsInputSchema.parse(input);
  const docker = await dockerAvailable();
  const container = docker.available ? await inspectContainer() : { exists: false, running: false };
  const ports = await Promise.all(args.ports.map(async (port) => ({ port, open: await checkPort('127.0.0.1', port) })));
  const health = await fetchJson(agenticFacts.healthEndpoint);
  const expectedEnv = localcloudServices.map((service) => envVarName(service.envVar));
  const env = args.includeEnv
    ? expectedEnv.map((name) => ({ name, set: Boolean(process.env[name]), value: process.env[name] ? '<set>' : '<unset>' }))
    : [];
  const pitfalls = [
    'Do not fall back to real Google Cloud when LocalCloud is unavailable; stop and fix routing first.',
    'Unset emulator variables and validate against real Google Cloud before production deployment.',
    'Default LocalCloud workflows require no GCP account, credentials, service-account key, or billing project.',
  ];
  const ok = docker.available && container.running && health.ok;
  return jsonResult({ ok, docker: { available: docker.available }, container, ports, health, env, pitfalls, docs: ['https://local.cloud/compatibility/', 'https://local.cloud/services/', 'https://local.cloud/docs/sdk-examples/'] }, { isError: !ok });
}

const summarizeLogs = (lines: string[]) => {
  const errorLines = lines.filter((line) => /\b(error|exception|panic|fatal|failed)\b/i.test(line));
  const requestLines = lines.filter((line) => /\b(GET|POST|PUT|PATCH|DELETE|grpc|request)\b/i.test(line));
  const groupedErrors = errorLines.reduce<Record<string, number>>((groups, line) => {
    const key = line.replace(/\d{2,}/g, '#').slice(0, 160);
    groups[key] = (groups[key] ?? 0) + 1;
    return groups;
  }, {});
  return { totalLines: lines.length, errorCount: errorLines.length, requestCount: requestLines.length, groupedErrors };
};

export async function handleLogs(input: z.input<typeof logsInputSchema>): Promise<ToolResult> {
  const args = logsInputSchema.parse(input);
  const result = await logs(args.containerName, args.tailLines);
  if (result.exitCode !== 0) {
    return jsonResult({ ok: false, command: { command: result.command, args: result.args, exitCode: result.exitCode }, stderr: result.stderr }, { isError: true });
  }

  const rawLines = result.stdout.split(/\r?\n/).filter((line) => line.length > 0);
  const filteredLines = args.service ? rawLines.filter((line) => line.toLowerCase().includes(args.service!.toLowerCase())) : rawLines;
  const summary = summarizeLogs(filteredLines);
  const errors = filteredLines.filter((line) => /\b(error|exception|panic|fatal|failed)\b/i.test(line));
  const requests = filteredLines.filter((line) => /\b(GET|POST|PUT|PATCH|DELETE|grpc|request)\b/i.test(line));
  const selected = args.mode === 'raw' ? filteredLines : args.mode === 'errors' ? errors : args.mode === 'requests' ? requests : [];
  const { text, truncation } = truncateText(selected.join('\n'), args.maxBytes);
  return jsonResult({ ok: true, mode: args.mode, summary, lines: selected.length > 0 ? text.split('\n') : [], truncation, command: { command: result.command, args: result.args } }, { text: args.mode === 'summary' ? JSON.stringify(summary, null, 2) : text, limitBytes: args.maxBytes });
}

export async function handleState(input: z.input<typeof stateInputSchema>): Promise<ToolResult> {
  const args = stateInputSchema.parse(input);
  const before = await fetchJson(agenticFacts.healthEndpoint);
  const container = await inspectContainer(args.containerName);
  if (args.action === 'inspect') {
    const inspect = container.exists ? await inspectState(args.containerName) : undefined;
    return jsonResult({ ok: true, container, health: before, dockerInspect: inspect ? { exitCode: inspect.exitCode, stdout: inspect.stdout, stderr: inspect.stderr } : null, docs: ['https://local.cloud/docs/seed-data/'] });
  }
  if (args.confirm !== true) {
    return refusal('localcloud-state reset is destructive and requires confirm: true.', { action: 'reset', confirmRequired: true });
  }
  if (process.env.LOCALCLOUD_MCP_ENABLE_STATE_RESET !== '1') {
    return refusal('State reset is disabled by default. Set LOCALCLOUD_MCP_ENABLE_STATE_RESET=1 and pass confirm: true to call the LocalCloud reset endpoint.', { action: 'reset', resetEndpoint: args.resetEndpoint });
  }
  const reset = await fetch(args.resetEndpoint, { method: 'POST' }).then(async (response) => ({ ok: response.ok, status: response.status, body: await response.text() })).catch((error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  const after = await fetchJson(agenticFacts.healthEndpoint);
  const afterContainer = await inspectContainer(args.containerName);
  return jsonResult({ ok: reset.ok, before: { health: before, container }, reset, after: { health: after, container: afterContainer } }, { isError: !reset.ok });
}

export async function handleDocs(input: z.input<typeof docsInputSchema>): Promise<ToolResult> {
  const args = docsInputSchema.parse(input);
  const query = args.topic?.toLowerCase();
  const docs = query
    ? docsCorpus.filter((entry) => entry.title.toLowerCase().includes(query) || entry.summary.toLowerCase().includes(query) || entry.topics.some((topic) => topic.includes(query)) || (entry.url.includes('services') && localcloudServices.some((service) => serviceMatches(query, service)))).slice(0, args.limit)
    : docsCorpus.slice(0, args.limit);
  const services = query ? localcloudServices.filter((service) => serviceMatches(query, service)).slice(0, args.limit) : [];
  return jsonResult({ ok: true, docs, services, prompts: args.includePrompts ? promptLibrary : [], safety: { noCredentials: agenticFacts.noCredentialBoundary, production: agenticFacts.releaseGuardrail } });
}

const deniedGcloudTokens = [/^auth$/i, /^config$/i, /^iam$/i, /^billing$/i, /^projects$/i, /^--credential/i, /^--account/i, /^--impersonate-service-account/i, /googleapis\.com/i, /https?:\/\/(?!localhost|127\.0\.0\.1)/i];
const allowedGcloudGroups: Record<string, true> = { pubsub: true, firestore: true, storage: true, bigquery: true, spanner: true, bigtable: true, emulators: true };

export function validateGcpClientArgs(args: string[]): { ok: true } | { ok: false; reason: string } {
  const first = args[0];
  if (!first || !allowedGcloudGroups[first]) {
    return { ok: false, reason: `Only these gcloud command groups are allowed: ${Object.keys(allowedGcloudGroups).join(', ')}.` };
  }
  const denied = args.find((arg) => deniedGcloudTokens.some((pattern) => pattern.test(arg)));
  if (denied) {
    return { ok: false, reason: `Denied unsafe gcloud argument: ${denied}` };
  }
  return { ok: true };
}

export async function handleGcpClient(input: z.input<typeof gcpClientInputSchema>): Promise<ToolResult> {
  const args = gcpClientInputSchema.parse(input);
  const validation = validateGcpClientArgs(args.args);
  if (!validation.ok) {
    return refusal(validation.reason, { args: args.args });
  }
  const finalArgs = ['--project', args.project, ...args.args];
  if (args.execute) {
    return refusal(
      'gcloud execution is unavailable: static SDK emulator variables do not safely force gcloud routing. Use the dry-run plan, then obtain runtime-generated CLOUDSDK_API_ENDPOINT_OVERRIDES_* values from the selected instance before executing gcloud outside this tool.',
      { args: finalArgs, executionAvailable: false },
    );
  }
  return jsonResult({
    ok: true,
    dryRun: true,
    command: 'gcloud',
    args: finalArgs,
    note: 'Planning only. Before external execution, obtain /env?format=json from the selected instance, verify every CLOUDSDK_API_ENDPOINT_OVERRIDES_* URL is loopback or the intended isolated container alias, and refuse any command group without a generated local override.',
  });
}
