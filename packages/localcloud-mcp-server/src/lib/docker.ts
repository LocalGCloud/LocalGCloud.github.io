import { createConnection } from 'node:net';
import { agenticFacts } from '../data/localcloudFacts.js';
import { runFile, type CommandResult } from './process.js';

export interface ContainerSummary {
  exists: boolean;
  running: boolean;
  status?: string;
  image?: string;
  id?: string;
  names?: string[];
}

const docker = (args: string[], timeoutMs = 15_000) => runFile('docker', args, { timeoutMs, maxOutputBytes: 64_000 });

export async function dockerAvailable(): Promise<{ available: boolean; result: CommandResult }> {
  const result = await docker(['version', '--format', '{{.Server.Version}}'], 8_000);
  return { available: result.exitCode === 0, result };
}

export async function inspectContainer(containerName: string = agenticFacts.containerName): Promise<ContainerSummary> {
  const result = await docker([
    'inspect',
    containerName,
    '--format',
    '{{.Id}}\t{{.State.Running}}\t{{.State.Status}}\t{{.Config.Image}}\t{{json .Name}}',
  ]);
  if (result.exitCode !== 0) {
    return { exists: false, running: false };
  }

  const [id, running, status, image, rawName] = result.stdout.trim().split('\t');
  const normalizedName = rawName ? rawName.replace(/^"\/?|"$/g, '') : containerName;
  const summary: ContainerSummary = {
    exists: true,
    running: running === 'true',
    names: [normalizedName],
  };
  if (status) summary.status = status;
  if (image) summary.image = image;
  if (id) summary.id = id;
  return summary;
}

export async function startContainer(containerName: string = agenticFacts.containerName, image: string = agenticFacts.dockerImage): Promise<CommandResult> {
  const existing = await inspectContainer(containerName);
  if (existing.exists && !existing.running) {
    return docker(['start', containerName], 30_000);
  }
  if (existing.exists && existing.running) {
    return {
      command: 'docker',
      args: ['start', containerName],
      exitCode: 0,
      signal: null,
      stdout: `${containerName} is already running`,
      stderr: '',
      stdoutTruncation: { truncated: false, originalBytes: 0, returnedBytes: 0, limitBytes: 0 },
      stderrTruncation: { truncated: false, originalBytes: 0, returnedBytes: 0, limitBytes: 0 },
    };
  }

  const args = agenticFacts.dockerRunArgs.map((arg) => (arg === agenticFacts.dockerImage ? image : arg));
  return docker(args, 45_000);
}

export function stopContainer(containerName: string = agenticFacts.containerName): Promise<CommandResult> {
  return docker(['stop', containerName], 30_000);
}

export function restartContainer(containerName: string = agenticFacts.containerName): Promise<CommandResult> {
  return docker(['restart', containerName], 45_000);
}

export function logs(containerName: string = agenticFacts.containerName, tailLines = 200): Promise<CommandResult> {
  return docker(['logs', '--tail', String(Math.max(1, Math.min(tailLines, 2_000))), containerName], 15_000);
}

export function inspectState(containerName: string = agenticFacts.containerName): Promise<CommandResult> {
  return docker(['inspect', containerName], 15_000);
}

export async function checkPort(host: string, port: number, timeoutMs = 500): Promise<boolean> {
  let resolvePort!: (value: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    resolvePort = resolve;
  });
  const socket = createConnection({ host, port });
  const timer = setTimeout(() => {
    socket.destroy();
    resolvePort(false);
  }, timeoutMs);
  socket.once('connect', () => {
    clearTimeout(timer);
    socket.end();
    resolvePort(true);
  });
  socket.once('error', () => {
    clearTimeout(timer);
    resolvePort(false);
  });
  return promise;
}
