export const freeUseAnswer = 'Yes. LocalCloud is free forever for open-source projects and individual developers.';
export const includedServicesQuestion = 'Are there separate paid services?';
export const includedServicesAnswer = 'No. All supported services are included.';

export interface FaqEntry {
  question: string;
  answer: string;
  code?: string;
  afterCode?: string;
  contentUpdated?: true;
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
        answer: 'We run local versions of Google Cloud services such as BigQuery, Pub/Sub, and Cloud Storage in Docker so you can develop and test on your laptop or in CI.',
        contentUpdated: true,
      },
      {
        question: 'Is LocalCloud free?',
        answer: freeUseAnswer,
        contentUpdated: true,
      },
      {
        question: includedServicesQuestion,
        answer: includedServicesAnswer,
        contentUpdated: true,
      },
      {
        question: 'How do I get started?',
        answer: 'Run brew install LocalGCloud/tap/localcloud, then localcloud start to launch a ready-to-use container.',
        contentUpdated: true,
      },
    ],
  },
  {
    title: 'Compatibility',
    entries: [
      {
        question: 'Will my existing code work?',
        answer: 'Yes, for supported workflows. Keep your application logic and point your gcloud commands, API calls, and SDKs at LocalCloud using environment variables or your client’s endpoint settings.',
        contentUpdated: true,
      },
      {
        question: 'Which SDK languages are supported?',
        answer:
          'Compatibility depends on the client version, transport, endpoint handling and the operation. Start from the SDK examples in these docs, and test your exact client and operation.',
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
          'Startup time depends on your machine and on whether the image is already cached. Gate automation on localcloud start status plus /readiness (or the workflow-specific readiness endpoint), not a fixed delay.',
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
        afterCode: 'Confirm the service is enabled and check its guide for the operation you’re testing.',
        contentUpdated: true,
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
