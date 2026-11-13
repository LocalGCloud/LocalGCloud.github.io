import { blogDemoPages } from './agenticContent';
import { authoredBlogMetadata, getBlogMetadata } from './blogPresentation';

export interface BlogPostEntry {
  slug: string;
  path: string;
  title: string;
  description: string;
  topic: string;
  minutes: number;
  date?: string;
  dateLabel: string;
}

type AuthoredSlug = keyof typeof authoredBlogMetadata;

const authoredEntry = (
  slug: AuthoredSlug,
  title: string,
  description: string,
): BlogPostEntry => {
  const meta = authoredBlogMetadata[slug];
  return {
    slug,
    path: `/blog/${slug}/`,
    title,
    description,
    topic: meta.topic,
    minutes: meta.minutes,
    date: meta.publishedAt,
    dateLabel: 'Published',
  };
};

// Shared by the blog index and RSS so titles, summaries and dates stay together.
export const blogPosts: BlogPostEntry[] = [
  authoredEntry(
    'the-2ms-inner-loop',
    'The 2ms Inner Loop: Protect Focus on Cloud Code',
    'Cloud API latency fractures developer flow state. Run Google Cloud storage, queues, and SQL locally at 2ms p50 latency so your inner loop stays instant.',
  ),
  authoredEntry(
    'step-through-breakpoints-gcp',
    'Good Riddance, console.log: Debug GCP With Breakpoints',
    'Stop deploying print statements and waiting on Cloud Logging. Attach IDE breakpoints to Google Cloud handlers and inspect local state in the web console.',
  ),
  authoredEntry(
    'reproduce-gcp-incidents-locally',
    'Reproduce Production GCP Incidents Locally in Minutes',
    'Stop guessing at production edge cases. Seed matching schemas and replay failing Pub/Sub or BigQuery payloads safely inside an isolated local container.',
  ),
  authoredEntry(
    'tdd-google-cloud-watch-mode',
    'True TDD for Google Cloud With Watch Mode',
    'Run pytest or jest --watch against real Google Cloud SDKs without slow network calls or cloud bills by resetting local project state between test saves.',
  ),
  authoredEntry(
    'zero-ticket-cloud-prototyping',
    'Kill the IAM Ticket: Prototype GCP Before Approval',
    'Stop waiting days for GCP project permissions or billing setup. Prototype Cloud Tasks, Pub/Sub, and Secret Manager locally in 60 seconds.',
  ),
  authoredEntry(
    'parallel-git-worktrees-localcloud',
    'Parallel Git Worktrees With Zero Cloud Collisions',
    'Work on a feature branch, PR review, and urgent hotfix simultaneously by isolating each Git worktree with its own LocalCloud Docker data volume.',
  ),
  authoredEntry(
    'one-second-cloud-state-resets',
    'Stop Paranoid Debugging: 1-Second Cloud State Resets',
    'Stop wasting hours debugging phantom errors from dirty staging data. Reset local GCP state and restore deterministic YAML fixtures in under a second.',
  ),
  authoredEntry(
    'why-ai-agents-need-local-cloud',
    'Why AI Coding Agents Need Local Cloud, Not Mocks',
    'Unit mocks hide SDK hallucinations and real GCP keys risk secret leaks. Give coding agents an honest localhost cloud sandbox via LocalCloud MCP.',
  ),
  authoredEntry(
    'missing-bigquery-emulator-local-sql',
    'Test Google BigQuery Locally Without a Cloud Project',
    'Google provides no official BigQuery emulator. Run GoogleSQL queries, table DDL, and streaming inserts on localhost with standard BigQuery SDKs.',
  ),
  authoredEntry(
    'event-driven-pipelines-gcs-pubsub-bigquery',
    'Local Event Pipelines: GCS, Pub/Sub, and BigQuery',
    'Test multi-service ingestion pipelines end to end on your laptop by wiring Cloud Storage, Pub/Sub notifications, and BigQuery in one LocalCloud container.',
  ),
  authoredEntry(
    'zero-secret-gcp-ci-github-actions',
    'Zero-Secret GCP Integration Tests in GitHub Actions',
    'Eliminate cloud billing and service-account secrets from PR checks. Spin up an ephemeral LocalCloud environment inside GitHub Actions in seconds.',
  ),
  authoredEntry(
    'single-container-gcp-beyond-three-emulators',
    'Single-Container GCP: Beyond 3 Official Emulators',
    'Google only ships standalone emulators for Pub/Sub, Firestore, and Spanner. Run 25 GCP services locally in one Docker container with unified env exports.',
  ),
  authoredEntry(
    'validate-gcp-terraform-locally',
    'Validate Google Cloud Terraform Locally Before Apply',
    'Test hashicorp/google Terraform resources locally before touching live GCP. Configure endpoint overrides, fake local credentials, and readiness gates.',
  ),
  authoredEntry(
    'local-secrets-kms-without-iam-friction',
    'Test Secret Manager and Cloud KMS Locally Without IAM',
    'Eliminate plaintext .env workarounds in development. Exercise Secret Manager versions and Cloud KMS cryptographic workflows locally using standard GCP SDKs.',
  ),
  authoredEntry(
    'inside-localcloud-multiplexing-20-services',
    'Inside LocalCloud: 20+ GCP Protocols in One Container',
    'How LocalCloud multiplexes HTTP, gRPC, PostgreSQL, MySQL, and RESP across 20+ GCP services in one ~5s cold-boot container on Apple Silicon and Linux.',
  ),
  authoredEntry(
    'localcloud-mcp-agent-cloud',
    'A local cloud environment for coding agents',
    'Connect LocalCloud MCP to your coding agent, then test Cloud Storage, Pub/Sub, and BigQuery locally with standard Google Cloud SDKs.',
  ),
  authoredEntry(
    'localcloud-for-open-source',
    'Bring No-Cost Cloud Integration Testing Into Your Repository: Low Setup, Easy Contributions',
    'Run Google Cloud tests locally with zero cloud-resource costs and an easier contribution workflow. Free for open-source development and CI under the Free for open-source projects policy.',
  ),
  ...blogDemoPages.map((page) => ({
    slug: page.slug,
    path: page.path,
    title: page.h1,
    description: page.description,
    ...getBlogMetadata(page),
  })),
];
