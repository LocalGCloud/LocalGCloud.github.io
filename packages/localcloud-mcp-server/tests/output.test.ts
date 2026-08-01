import { describe, expect, it } from 'vitest';
import { handleDocs, handleServices } from '../src/index.js';
import { truncateText } from '../src/lib/result.js';

describe('output behavior', () => {
  it('returns structured content with a text mirror', async () => {
    const result = await handleServices({ service: 'pubsub' });
    expect(result.structuredContent.ok).toBe(true);
    expect(result.structuredContent.count).toBeGreaterThan(0);
    expect(result.content[0]?.type).toBe('text');
    expect(result.content[0]?.text).toContain('Pub/Sub');
  });

  it('bounds large output and reports truncation', () => {
    const result = truncateText('x'.repeat(200), 32);
    expect(result.truncation.truncated).toBe(true);
    expect(result.text).toContain('output truncated');
  });

  it('documents no-credential and production boundaries', async () => {
    const result = await handleDocs({ includePrompts: true, topic: 'sdk' });
    expect(JSON.stringify(result.structuredContent)).toContain('GCP account');
    expect(JSON.stringify(result.structuredContent)).toContain('real Google Cloud');
  });
});
