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
    'The Millisecond Inner Loop: Cloud Code at Thinking Speed',
    'Remote cloud calls break your concentration. Run Google Cloud storage, queues and SQL on localhost and integration tests answer in milliseconds.',
  ),
  authoredEntry(
    'step-through-breakpoints-gcp',
    'Good Riddance, console.log: Debug GCP With Breakpoints',
    'Stop deploying print statements and waiting on Cloud Logging. Attach IDE breakpoints to Google Cloud handlers and inspect local state in the web console.',
  ),
  authoredEntry(
    'reproduce-gcp-incidents-locally',
    'Reproduce Production GCP Incidents Locally in Minutes',
    'Rebuild the topic, table and failing payload from a production incident on localhost, watch the real traceback, and fix it without touching staging.',
  ),
  authoredEntry(
    'tdd-google-cloud-watch-mode',
    'True TDD for Google Cloud With Watch Mode',
    'Rerun cloud integration tests on every save. A pytest watcher, the real Google Cloud SDKs on localhost, and a project reset before each run.',
  ),
  authoredEntry(
    'zero-ticket-cloud-prototyping',
    'Kill the IAM Ticket: Prototype GCP Before Approval',
    'Try the design before you request the project. Prototype Cloud Tasks, Pub/Sub and Secret Manager locally, then ask for only what works.',
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
    'An agent that writes its own mocks is marking its own homework, and a real GCP key is too risky. Give it a local cloud that pushes back.',
  ),
  authoredEntry(
    'missing-bigquery-emulator-local-sql',
    'Test Google BigQuery Locally Without a Cloud Project',
    'Google publishes no BigQuery emulator. Run GoogleSQL queries, table DDL and streaming inserts on localhost with the standard BigQuery client.',
  ),
  authoredEntry(
    'event-driven-pipelines-gcs-pubsub-bigquery',
    'Local Event Pipelines: GCS, Pub/Sub, and BigQuery',
    'Test multi-service ingestion pipelines end to end on your laptop by wiring Cloud Storage, Pub/Sub notifications, and BigQuery in one LocalCloud container.',
  ),
  authoredEntry(
    'zero-secret-gcp-ci-github-actions',
    'Zero-Secret GCP Integration Tests in GitHub Actions',
    'Run integration tests on every pull request with no service-account key and no shared staging project. One step starts LocalCloud inside the job.',
  ),
  authoredEntry(
    'single-container-gcp-beyond-three-emulators',
    "One Container for GCP: Past Google's Handful of Emulators",
    "Google's emulators cover five services, one process each. Run 25 Google Cloud services locally in one Docker container with one command to configure SDKs.",
  ),
  authoredEntry(
    'validate-gcp-terraform-locally',
    'Validate Google Cloud Terraform Locally Before Apply',
    "terraform plan can't tell you what the API will reject. Apply your Google provider resources against localhost first, with local state and fake credentials.",
  ),
  authoredEntry(
    'local-secrets-kms-without-iam-friction',
    'Test Secret Manager and Cloud KMS Locally Without IAM',
    'Delete the .env shortcut. Rotate a Secret Manager secret and encrypt with a Cloud KMS key on localhost, using the standard Google Cloud clients.',
  ),
  authoredEntry(
    'inside-localcloud-multiplexing-20-services',
    'Inside LocalCloud: 6 Protocols, 20+ Services, One Container',
    'How one container answers HTTP, gRPC, PostgreSQL, MySQL and Redis clients for 20+ Google Cloud services: a shared gateway plus purpose-built engines.',
  ),
  authoredEntry(
    'localcloud-mcp-agent-cloud',
    'A Local Cloud Environment for Coding Agents',
    'Connect LocalCloud MCP to your coding agent, then test Cloud Storage, Pub/Sub, and BigQuery locally with standard Google Cloud SDKs.',
  ),
  authoredEntry(
    'localcloud-for-open-source',
    'Bring No-Cost Cloud Integration Testing Into Your Repository',
    'Run Google Cloud integration tests locally at zero cloud-resource cost and make contributing easier. LocalCloud is free for open-source development and CI.',
  ),
  ...blogDemoPages.map((page) => ({
    slug: page.slug,
    path: page.path,
    title: page.h1,
    description: page.description,
    ...getBlogMetadata(page),
  })),
];
