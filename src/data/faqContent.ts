import { cliQuickStart } from '../utils/quickstart.mjs';
import { docsContract } from './docs-contract';

export interface FaqEntry {
  question: string;
  answer: string;
  code?: string;
  afterCode?: string;
}

export interface FaqSection {
  title: string;
  entries: FaqEntry[];
}

export const faqSections: FaqSection[] = [
  {
    title: 'General',
    entries: [
      {
        question: 'What is LocalCloud?',
        answer:
          'LocalCloud is a local Google Cloud development sandbox. One Docker container runs local versions of Google Cloud services, a web console, and management APIs. Each service documents which operations it supports.',
      },
      {
        question: 'Is LocalCloud free?',
        answer:
          'Yes. During public preview, individuals and organizations, including for-profit companies, may use LocalCloud free of charge for local and internal development, testing, CI, evaluation, and internal pilots. No payment method or license key is required. Read the Licensing page and governing license for the exact terms.',
      },
      {
        question: 'What is the recommended setup?',
        answer: 'Install the host CLI, verify Docker, start a persistent runtime, load its generated environment values, and open the returned console URL.',
        code: cliQuickStart(docsContract).script,
        afterCode:
          'Start with --local-only so the runtime listens only on localhost. The CLI keeps data between restarts by default. If a default port is already in use, the CLI picks another one; use the URLs and environment values it returns.',
      },
    ],
  },
  {
    title: 'Compatibility',
    entries: [
      {
        question: 'Do I need to change application code?',
        answer:
          'Some SDKs honor emulator variables without code changes; others require explicit endpoint or client configuration. Load localcloud env into the application process, check the operation matrix, and stop if a client falls back to real Google Cloud.',
      },
      {
        question: 'Which SDK languages are supported?',
        answer:
          "LocalCloud doesn't publish a per-language support matrix. Compatibility depends on client version, transport, endpoint handling, and emulator behavior; start from the SDK examples and validate your exact client and operation.",
      },
      {
        question: 'How complete is BigQuery emulation?',
        answer:
          'BigQuery runs on a DuckDB-backed local emulator; support is documented feature by feature.',
      },
      {
        question: 'Can I use LocalCloud in CI/CD?',
        answer:
          'Yes. The Public Preview License permits ongoing internal CI and delivery automation for individuals and organizations, including for-profit companies. Keep local CI credentialless and validate release behavior against real Google Cloud in a separate guarded step.',
      },
    ],
  },
  {
    title: 'Runtime behavior',
    entries: [
      {
        question: 'How much memory does LocalCloud need?',
        answer: "The CLI allocates 4 GB by default. Actual use depends on enabled services and workload; LocalCloud isn't guaranteed to run with less.",
      },
      {
        question: 'How long does startup take?',
        answer:
          "Gate automation on localcloud start status plus /readiness (or the workflow-specific readiness endpoint), not a fixed duration. Startup time isn't benchmarked across platforms.",
      },
      {
        question: 'Is data persisted between restarts?',
        answer:
          'The CLI uses persistent storage by default. Pub/Sub uses PostgreSQL; other services use different stores and recovery limits. A mounted volume does not provide production durability, replication, or backup semantics.',
      },
      {
        question: 'How do I isolate or reuse a LocalCloud runtime?',
        answer:
          'The Docker volume mounted at /var/lib/localcloud identifies the runtime and keeps its data. Use --data-volume NAME on any runtime command for isolated storage. The CLI can attach to a compatible container already using that volume, but it never removes or relabels Docker resources it does not own.',
        code: 'localcloud start --local-only --data-volume payments-localcloud-data\nlocalcloud status --data-volume payments-localcloud-data --verbose',
      },
      {
        question: 'Is LocalCloud fully offline?',
        answer:
          'Not entirely. Core local workflows can run offline after the required images are downloaded. Depending on configuration, the runtime can also emit telemetry, probe certificate storage, check image updates, validate licenses or live IAM tokens, and dispatch HTTP work; see the Privacy and Architecture guides for outbound behavior.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    entries: [
      {
        question: 'What if a port is already in use?',
        answer: 'Use the host CLI: if a default port is already in use, it picks another one. Then reload the generated environment values.',
        code: 'localcloud start --local-only\neval "$(localcloud env)"',
        afterCode: 'Do not replace returned endpoint values with a hard-coded port.',
      },
      {
        question: 'What if a service is not responding?',
        answer: 'Inspect the runtime and its logs. If you run the container manually on the default ports, /services shows service state.',
        code: 'localcloud status\nlocalcloud logs --tail 50\ncurl -fsS http://localhost:5380/services',
        afterCode: 'Confirm the service is enabled, its required tier is available, and its documented support level is suitable for the workflow.',
      },
      {
        question: 'Why do GKE, Cloud Run, and Dataproc need Docker access?',
        answer:
          'By default (host.docker_socket: auto), the CLI mounts the Docker socket only when an enabled service needs it. Set host.docker_socket: false to opt out. A read-write socket mount grants broad control of the host Docker daemon, so enable services that need it only when your workflow requires Docker containers or k3d.',
      },
    ],
  },
];

export const faqEntries = faqSections.flatMap((section) => section.entries);
