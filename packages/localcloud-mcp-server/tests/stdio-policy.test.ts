import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('stdio separation policy', () => {
  it('does not write application logs to stdout in source', () => {
    const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('console.log');
    expect(source).toContain('console.error');
  });
});
