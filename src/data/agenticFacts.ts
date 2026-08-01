import { productFacts } from './productFacts';
import { services, type Service } from './services';

export interface EvidenceRecord {
  source: string;
  reviewedAt: string;
  reviewer: string;
}

export interface AgenticEndpoint {
  label: string;
  url: string;
  purpose: string;
}

export interface AgenticServiceMetadata {
  name: string;
  slug: string;
  status: 'supported' | 'partial' | 'planned';
  port: string;
  protocol: string;
  envVar: string;
  docsUrl: string;
  implementation: Service['implementation'];
  supported: string[];
  gaps: string[];
  caveat: string;
}

export interface AgentPrompt {
  id: string;
  label: string;
  useCase: string;
  prompt: string;
}

export const agenticFacts = {
  positioning:
    'LocalCloud is an agent-safe local Google Cloud sandbox: one Docker container, standard GCP SDKs pointed at localhost, no GCP account, no GCP credentials, and no cloud spend during local development.',
  dockerImage: productFacts.dockerImage,
  containerName: 'localcloud',
  defaultProject: 'local-project',
  memoryRequirement: '4g',
  consoleUrl: 'http://localhost:24080',
  adminBaseUrl: 'http://localhost:24080',
  healthEndpoint: 'http://localhost:24080/_localcloud/health',
  shellEnvEndpoint: 'http://localhost:24080/_localcloud/env?format=shell',
  terraformEnvEndpoint: 'http://localhost:24080/_localcloud/env?format=terraform',
  dockerPullCommand: `docker pull ${productFacts.dockerImage}`,
  dockerRunCommand: `docker run -d -p 8080:24080 -p 4443:24081 -p 8085-8087:24082-8087 \\\n  -p 9010:24085 -p 9020:24086 -p 9050:24087 -p 9060:24088 -p 6379:24089 \\\n  -m 4g --name localcloud \\\n  -v localcloud-data:/var/lib/localcloud \\\n  ${productFacts.dockerImage}`,
  envExportCommand: 'eval "$(curl -s http://localhost:24080/_localcloud/env?format=shell)"',
  terraformEnvCommand: 'curl -s http://localhost:24080/_localcloud/env?format=terraform',
  productionBoundary: productFacts.productionBoundary,
  noCredentialBoundary:
    'Default LocalCloud development and CI workflows must not require a GCP account, Google credentials, service-account keys, or a billing project.',
  releaseGuardrail:
    'Before production deployment, unset LocalCloud emulator environment variables and validate behavior against real Google Cloud.',
  evidence: {
    source: 'Approved LocalCloud product direction, public llms.txt, service catalog, and runtime documentation',
    reviewedAt: '2026-07-02',
    reviewer: 'LocalCloud agentic-economy OpenSpec research',
  } satisfies EvidenceRecord,
} as const;

export const agenticEndpoints: AgenticEndpoint[] = [
  {
    label: 'Web console',
    url: agenticFacts.consoleUrl,
    purpose: 'Inspect service health, local data, logs, and administrative state.',
  },
  {
    label: 'Health check',
    url: agenticFacts.healthEndpoint,
    purpose: 'Wait for LocalCloud readiness before SDK, Terraform, seed, or CI workflows.',
  },
  {
    label: 'Shell environment export',
    url: agenticFacts.shellEnvEndpoint,
    purpose: 'Set emulator endpoint variables for local SDK and CLI workflows.',
  },
  {
    label: 'Terraform environment export',
    url: agenticFacts.terraformEnvEndpoint,
    purpose: 'Set endpoint overrides for local Terraform validation without real GCP credentials.',
  },
];

const plannedService = (service: Service) =>
  service.supported.some((item) => item.toLowerCase().includes('planned'));

export const agenticServiceMetadata: AgenticServiceMetadata[] = services.map((service) => {
  const status: AgenticServiceMetadata['status'] = service.enabled
    ? service.notSupported.length > 0
      ? 'partial'
      : 'supported'
    : plannedService(service)
      ? 'planned'
      : 'partial';

  return {
    name: service.name,
    slug: service.slug,
    status,
    port: service.port,
    protocol: service.protocol,
    envVar: service.envVar,
    docsUrl: `${productFacts.siteUrl}services/${service.slug}/`,
    implementation: service.implementation,
    supported: service.supported,
    gaps: service.notSupported,
    caveat:
      status === 'planned'
        ? 'Planned service; do not ask agents to rely on it for local verification yet.'
        : service.notSupported.length
          ? `Local development coverage is partial. Known gaps: ${service.notSupported.join(', ')}.`
          : 'Supported for local development workflows; still validate production behavior against real Google Cloud.',
  };
});

export const agentPromptLibrary: AgentPrompt[] = [
  {
    id: 'quickstart',
    label: 'Start LocalCloud',
    useCase: 'Give an agent one URL and have it start the local GCP sandbox.',
    prompt:
      'Fetch https://local.cloud/ai/agents.md and follow the instructions to start LocalCloud on my machine. Verify Docker, start or reuse the localcloud container, export emulator environment variables, and run one local GCP SDK/API smoke check. Do not ask for or use real GCP credentials.',
  },
  {
    id: 'project-integration',
    label: 'Configure this repo',
    useCase: 'Have an agent wire an existing project to LocalCloud safely.',
    prompt:
      'Set up this repository to use LocalCloud for local GCP development. First read https://local.cloud/ai/agents.md, then inspect this repo, identify the GCP services and SDK language, configure emulator environment variables, and run the narrowest integration test against localhost. Do not use real GCP credentials or production endpoints.',
  },
  {
    id: 'ci',
    label: 'Prepare CI',
    useCase: 'Have an agent propose a CI sidecar/runtime setup.',
    prompt:
      'Prepare this repository for CI with LocalCloud. Read https://local.cloud/ai/agents.md and https://local.cloud/docs/terraform/, then propose the smallest CI change that starts LocalCloud, waits for readiness, exports emulator env vars, runs integration tests locally, and avoids real GCP secrets.',
  },
  {
    id: 'troubleshoot',
    label: 'Troubleshoot routing',
    useCase: 'Diagnose why SDKs or Terraform are still reaching real GCP.',
    prompt:
      'Troubleshoot my LocalCloud setup. Read https://local.cloud/ai/agents.md, check whether Docker and the localcloud container are healthy, verify emulator environment variables are set in this shell/test runner, and identify any SDK or Terraform configuration that could still call real Google Cloud.',
  },
  {
    id: 'bigquery',
    label: 'BigQuery local test',
    useCase: 'Ask an agent to validate BigQuery code against the local emulator.',
    prompt:
      'Use LocalCloud to test BigQuery code locally. Read https://local.cloud/ai/agents.md and the BigQuery docs, set BIGQUERY_EMULATOR_HOST for localhost, create a local dataset/table, insert sample rows, run a representative query, and call out any unsupported SQL features instead of using real BigQuery.',
  },
  {
    id: 'pubsub',
    label: 'Pub/Sub local test',
    useCase: 'Ask an agent to validate Pub/Sub event code locally.',
    prompt:
      'Use LocalCloud to test Pub/Sub locally. Read https://local.cloud/ai/agents.md, set PUBSUB_EMULATOR_HOST=localhost:24082, create a topic and subscription, publish one test message, pull or stream it, ack it, and verify the payload without using real GCP credentials.',
  },
  {
    id: 'firestore',
    label: 'Firestore local test',
    useCase: 'Ask an agent to validate Firestore reads/writes locally.',
    prompt:
      'Use LocalCloud to test Firestore locally. Read https://local.cloud/ai/agents.md, set FIRESTORE_EMULATOR_HOST=localhost:24083, create a local document, read it back through the project SDK, and document any index or aggregation behavior that still needs real GCP validation.',
  },
  {
    id: 'cloud-storage',
    label: 'Cloud Storage local test',
    useCase: 'Ask an agent to validate bucket/object code locally.',
    prompt:
      'Use LocalCloud to test Cloud Storage locally. Read https://local.cloud/ai/agents.md, set STORAGE_EMULATOR_HOST=http://localhost:24081, create a bucket, upload a small object, list it, download it, and verify content without using real GCP credentials.',
  },
];

export const claimReviewRule = {
  title: 'Agentic claim review',
  rule:
    'No agentic page, skill, MCP metadata, or machine-readable file may publish a service capability, compatibility, cost, credential, Docker image, endpoint, or production-boundary claim unless it references an approved source, reviewer, and review date.',
  evidence: agenticFacts.evidence,
} as const;

export const agentSafeValidationChecklist = [
  'States LocalCloud is for development, testing, CI, and demos — not a production GCP replacement.',
  'States default workflows require no GCP account, no Google credentials, and no billing project.',
  'Uses the canonical Docker image jaysen2apache/localcloud unless productFacts changes.',
  'Points SDKs and Terraform to localhost/emulator endpoints before any verification step.',
  'Warns agents to stop rather than falling back to real GCP when Docker or LocalCloud is unavailable.',
  'Links service-specific claims to the service catalog, compatibility docs, or reviewed evidence.',
  'Instructs production validation against real Google Cloud after unsetting emulator environment variables.',
] as const;
