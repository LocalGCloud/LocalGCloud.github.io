import { describe, expect, it } from 'vitest';
import { handleGcpClient, handleRuntime, handleState, validateGcpClientArgs } from '../src/index.js';

describe('refusal behavior', () => {
  it('requires confirmation for destructive runtime actions', async () => {
    const result = await handleRuntime({ action: 'stop' });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.refused).toBe(true);
    expect(result.content[0]?.text).toContain('confirm: true');
  });

  it('requires confirmation for state reset before any reset call', async () => {
    const result = await handleState({ action: 'reset' });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.confirmRequired).toBe(true);
  });

  it('blocks unsafe gcloud command groups and credential flags', async () => {
    expect(validateGcpClientArgs(['auth', 'login']).ok).toBe(false);
    expect(validateGcpClientArgs(['pubsub', 'topics', 'list', '--credential-file=x']).ok).toBe(false);
    const result = await handleGcpClient({ args: ['auth', 'login'] });
    expect(result.isError).toBe(true);
  });

  it('keeps gcloud dry-run by default', async () => {
    const result = await handleGcpClient({ args: ['pubsub', 'topics', 'list'] });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.dryRun).toBe(true);
  });
});
