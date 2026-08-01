import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { truncateText, type Truncation } from './result.js';

export interface CommandResult {
  command: string;
  args: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stdoutTruncation: Truncation;
  stderrTruncation: Truncation;
}

export interface CommandOptions {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

const readStream = (stream: Readable | null, limitBytes: number): { append: (chunk: Buffer | string) => void; value: () => { text: string; truncation: Truncation } } => {
  const chunks: Buffer[] = [];
  let seenBytes = 0;

  const append = (chunk: Buffer | string) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    seenBytes += buffer.byteLength;
    const storedBytes = chunks.reduce((sum, item) => sum + item.byteLength, 0);
    if (storedBytes < limitBytes) {
      chunks.push(buffer.subarray(0, Math.max(0, limitBytes - storedBytes)));
    }
  };

  stream?.on('data', append);

  const value = () => {
    const text = Buffer.concat(chunks).toString('utf8');
    const truncated = seenBytes > Buffer.byteLength(text);
    if (!truncated) {
      return truncateText(text, limitBytes);
    }
    return {
      text: `${text}\n… process output truncated by localcloud-mcp-server …`,
      truncation: {
        truncated: true,
        originalBytes: seenBytes,
        returnedBytes: Buffer.byteLength(text),
        limitBytes,
      },
    };
  };

  return { append, value };
};

export async function runFile(command: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxOutputBytes = options.maxOutputBytes ?? 32_768;
  const child = spawn(command, args, {
    env: { ...process.env, ...options.env },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = readStream(child.stdout, maxOutputBytes);
  const stderr = readStream(child.stderr, maxOutputBytes);
  let resolveStatus!: (value: { exitCode: number | null; signal: NodeJS.Signals | null }) => void;
  const promise = new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    resolveStatus = resolve;
  });
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      child.kill('SIGTERM');
    }
  }, timeoutMs);

  child.once('error', () => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      resolveStatus({ exitCode: 127, signal: null });
    }
  });
  child.once('close', (exitCode, signal) => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      resolveStatus({ exitCode, signal });
    }
  });

  const status = await promise;
  const stdoutValue = stdout.value();
  const stderrValue = stderr.value();
  return {
    command,
    args,
    exitCode: status.exitCode,
    signal: status.signal,
    stdout: stdoutValue.text,
    stderr: stderrValue.text,
    stdoutTruncation: stdoutValue.truncation,
    stderrTruncation: stderrValue.truncation,
  };
}
