import { describe, expect, it } from 'vitest';
import { handleRuntime, handleServices } from '../src/index.js';
import { agenticFacts } from '../src/data/localcloudFacts.js';

const runIntegration = process.env.LOCALCLOUD_MCP_RUN_INTEGRATION === '1';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('LocalCloud MCP integration smoke', () => {
  it(
    'starts or reuses LocalCloud, verifies health, lists services, and exports local SDK env config',
    async () => {
      const runtime = await handleRuntime({ action: 'start', waitTimeoutMs: 90_000 });
      expect(runtime.structuredContent.ok).toBe(true);

      const health = await handleRuntime({ action: 'health' });
      expect(health.structuredContent.ok).toBe(true);

      const services = await handleServices({ service: 'pubsub', includeGaps: true });
      expect(services.structuredContent.count).toBeGreaterThan(0);
      expect(JSON.stringify(services.structuredContent)).toContain('PUBSUB_EMULATOR_HOST');

      const envResponse = await fetch(agenticFacts.shellEnvEndpoint);
      expect(envResponse.ok).toBe(true);
      const envText = await envResponse.text();
      expect(envText).toContain('PUBSUB_EMULATOR_HOST');
      expect(envText).toContain('GOOGLE_CLOUD_PROJECT');
    },
    120_000,
  );
});
