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
          'LocalCloud is a local Google Cloud development sandbox. It packages a gateway, service facades, external emulator processes, a console, and operator APIs in one Docker container. Each service has explicit operation-level compatibility limits.',
      },
      {
        question: 'Is LocalCloud free?',
        answer:
          'Yes for individual developers acting personally, students acting personally or academically, and legally organized nonprofit organizations supporting their nonprofit mission. Any use by or for a for-profit company requires a separate written commercial license. Read the Licensing page and governing license for the exact terms.',
      },
      {
        question: 'What is the recommended setup?',
        answer: 'Install the host CLI, verify Docker, start the selected data-volume runtime, load its generated environment values, and open the returned console URL.',
        code: 'curl -fsSL https://local.cloud/install.sh | sh\nlocalcloud doctor\nlocalcloud start\neval "$(localcloud env)"\nlocalcloud console',
        afterCode:
          'The CLI binds to loopback, keeps persistence by default, and can remap occupied ports. Trust the URLs and environment values it returns.',
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
          'There is no qualified blanket language matrix. Compatibility depends on client version, transport, endpoint handling, and emulator behavior. Use reviewed examples as a starting point and validate the exact client and operation.',
      },
      {
        question: 'How complete is BigQuery emulation?',
        answer:
          'BigQuery is a DuckDB-backed local emulator with partial, feature-specific behavior. Exact test totals, function counts, and coverage percentages are not reproducible from a pinned assembled release today. Dependency-sensitive behavior remains release-unverified until source and image provenance are qualified together.',
      },
      {
        question: 'Can I use LocalCloud in CI/CD?',
        answer:
          'The runtime can technically run in Docker-based CI. A nonprofit organization may use it for qualifying mission-related workflows under the Community License; a for-profit company must first obtain a separate commercial license. Keep local CI credentialless and validate release behavior against real Google Cloud in a separate guarded step.',
      },
    ],
  },
  {
    title: 'Runtime behavior',
    entries: [
      {
        question: 'How much memory does LocalCloud need?',
        answer: 'The reviewed CLI default is 4g. Actual use depends on enabled services and workload; no lower-memory guarantee was qualified.',
      },
      {
        question: 'How long does startup take?',
        answer:
          'There is no maintained cross-platform startup benchmark. Gate automation on localcloud start status plus /health or the workflow-specific readiness endpoint rather than a fixed duration.',
      },
      {
        question: 'Is data persisted between restarts?',
        answer:
          'The CLI uses persistent storage by default, but persistence is service-specific. Pub/Sub is volatile; other services use different stores and recovery limits. A mounted volume does not provide production durability, replication, or backup semantics.',
      },
      {
        question: 'How do I isolate or reuse a LocalCloud runtime?',
        answer:
          'The Docker volume mounted at /var/lib/localcloud is durable runtime identity. Use --data-volume NAME on any runtime command for isolated storage. The CLI can attach to a compatible container already using that volume, but it never removes or relabels Docker resources it does not own.',
        code: 'localcloud start --data-volume payments-localcloud-data\nlocalcloud status --data-volume payments-localcloud-data --verbose',
      },
      {
        question: 'Is LocalCloud fully offline?',
        answer:
          'No categorical offline guarantee applies. Depending on configuration, the runtime can emit telemetry, probe certificate storage, check image updates, validate licenses or live IAM tokens, and dispatch HTTP work. Core local workflows can operate offline after required images are present; review the Privacy and Architecture guides for outbound behavior.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    entries: [
      {
        question: 'What if a port is already in use?',
        answer: 'Use the host CLI so it can remap occupied canonical ports, then reload the generated environment values.',
        code: 'localcloud start\neval "$(localcloud env)"',
        afterCode: 'Do not replace returned endpoint values with a hard-coded port.',
      },
      {
        question: 'What if a service is not responding?',
        answer: 'Inspect the selected data-volume runtime and its logs. For manual Docker on canonical ports, /services exposes service state.',
        code: 'localcloud status\nlocalcloud logs --tail 50\ncurl -fsS http://localhost:24080/services',
        afterCode: 'Confirm the service is enabled, its required tier is available, and its documented support level is suitable for the workflow.',
      },
      {
        question: 'Why do GKE, Compute Engine, or Cloud Run need Docker access?',
        answer:
          'The host CLI disables Docker-socket access by default. Enable it only for workflows that require subordinate Docker containers or k3d; a read-write socket mount grants broad control of the host Docker daemon.',
      },
    ],
  },
];

export const faqEntries = faqSections.flatMap((section) => section.entries);
