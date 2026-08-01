import { describe, expect, it } from 'vitest';
import { diagnosticsInputSchema, docsInputSchema, logsInputSchema, runtimeInputSchema, servicesInputSchema, stateInputSchema } from '../src/index.js';

describe('tool schemas', () => {
  it('defaults safe runtime metadata', () => {
    const parsed = runtimeInputSchema.parse({});
    expect(parsed.action).toBe('status');
    expect(parsed.image).toBe('jaysen2apache/localcloud');
    expect(parsed.containerName).toBe('localcloud');
  });

  it('bounds potentially large inputs', () => {
    expect(() => logsInputSchema.parse({ maxBytes: 999 })).toThrow();
    expect(() => diagnosticsInputSchema.parse({ ports: [0] })).toThrow();
    expect(docsInputSchema.parse({ limit: 20 }).limit).toBe(20);
  });

  it('keeps service and state defaults non-destructive', () => {
    expect(servicesInputSchema.parse({}).status).toBe('all');
    expect(stateInputSchema.parse({}).action).toBe('inspect');
  });
});
