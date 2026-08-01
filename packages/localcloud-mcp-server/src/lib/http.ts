import { setTimeout as sleep } from 'node:timers/promises';
import { agenticFacts } from '../data/localcloudFacts.js';

export interface FetchStatus {
  ok: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}

export async function fetchJson(url: string, timeoutMs = 2_000): Promise<FetchStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let body: unknown = text;
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      body = JSON.parse(text) as unknown;
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForHealth(
  url = agenticFacts.healthEndpoint,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ ready: boolean; attempts: number; last: FetchStatus }> {
  const deadline = Date.now() + (options.timeoutMs ?? 30_000);
  const intervalMs = options.intervalMs ?? 1_000;
  let attempts = 0;
  let last: FetchStatus = { ok: false, error: 'not checked' };
  while (Date.now() < deadline) {
    attempts += 1;
    last = await fetchJson(url, Math.min(intervalMs, 2_000));
    if (last.ok) {
      return { ready: true, attempts, last };
    }
    await sleep(intervalMs);
  }
  return { ready: false, attempts, last };
}
