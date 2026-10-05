export interface ServiceExampleLink {
  title: string;
  href: string;
  label: string;
  description: string;
  external?: boolean;
  install?: string;
}

export interface ServiceGuide {
  intro: string;
  whenToUse: string;
  typicalUses: string[];
  example: { title: string; steps: string[] };
  reference: string;
  examples?: ServiceExampleLink[];
}

// Product context and links to maintained integration examples.
// Local workflow availability is owned by serviceCompatibilityEditorial.
export const serviceGuides: Readonly<Record<string, ServiceGuide>> = {
  gcs: {
    whenToUse: 'Use when your application stores unstructured files and addresses each object by bucket and name, with uploads, downloads, and object metadata handled through an API.',
    intro: 'Cloud Storage stores files as objects inside buckets. Use it for application uploads, datasets, and artifacts that need an object-storage API.',
    typicalUses: ['User uploads and downloads', 'Data pipeline inputs and outputs'],
    example: { title: 'Round-trip an uploaded file', steps: ['Create a bucket for test uploads.', 'Upload a text object through the Storage SDK.', 'Download it and assert that the content matches.'] },
    reference: 'https://docs.cloud.google.com/storage/docs/introduction',
    examples: [
      { title: 'Upload and download an object', href: '/docs/sdk-examples/#cloud-storage-python', install: 'google-cloud-storage', label: 'Python', description: 'Create a bucket and round-trip a text object locally.' },
      { title: 'Upload and download an object', href: '/docs/sdk-examples/#cloud-storage-nodejs', install: '@google-cloud/storage', label: 'Node.js', description: 'Use @google-cloud/storage with generated local endpoints.' },
    ],
  },
  pubsub: {
    whenToUse: 'Use when several consumers need to react to the same event independently of its publisher. Consumers acknowledge completed work and handle retries without blocking the producer.',
    intro: 'Pub/Sub is asynchronous messaging between publishers and subscribers. Topics decouple event producers from the applications that process those events.',
    typicalUses: ['Event-driven application pipelines', 'Background processing and fan-out'],
    example: { title: 'Publish, receive, and acknowledge an event', steps: ['Create a topic and a pull subscription.', 'Publish an order-created message.', 'Receive the payload and acknowledge it after processing.'] },
    reference: 'https://docs.cloud.google.com/pubsub/docs/overview',
    examples: [{ title: 'Publish and acknowledge a message', href: '/docs/sdk-examples/#pubsub-python', install: 'google-cloud-pubsub', label: 'Python', description: 'A repeatable topic, subscription, publish, and pull example.' }],
  },
  firestore: {
    whenToUse: 'Use when records have evolving fields and fit a collection-and-document model, with reads driven by document IDs or indexed field queries.',
    intro: 'Firestore is a document database that organizes application data into collections and documents. It suits flexible records such as profiles, catalogs, and application state.',
    typicalUses: ['User profiles and product catalogs', 'Document-based application backends'],
    example: { title: 'Store and query a product catalog', steps: ['Enable Firestore and create product documents.', 'Read a product by document ID.', 'Query one indexed field and check the returned products.'] },
    reference: 'https://docs.cloud.google.com/firestore/native/docs/overview',
    examples: [{ title: 'Create, read, and update a document', href: '/docs/sdk-examples/#firestore-python', install: 'google-cloud-firestore', label: 'Python', description: 'Enable Firestore, exercise a unique document, and clean up through the SDK.' }],
  },
  bigtable: {
    whenToUse: 'Use when high-volume records can be organized by a row key and retrieved through point lookups or bounded key-range scans. Design the row key around your most frequent reads.',
    intro: 'Bigtable is a wide-column database for large key-based datasets. Rows are sorted by key, making it useful for time-series data, event histories, and fast range reads.',
    typicalUses: ['Sensor readings and time-series events', 'Per-user activity and transaction histories'],
    example: { title: 'Read a device’s recent measurements', steps: ['Create a table with a readings column family.', 'Write timestamped measurements using device-prefixed row keys.', 'Read a bounded key range and verify values and filters.'] },
    reference: 'https://docs.cloud.google.com/bigtable/docs/overview',
    examples: [{ title: 'Write and read a Bigtable cell', href: '/docs/sdk-examples/#bigtable-python', install: 'google-cloud-bigtable', label: 'Python', description: 'Create a test instance and table, write a cell, verify its bytes, and clean up.' }],
  },
  spanner: {
    whenToUse: 'Use when related records need transactional consistency and SQL queries, and your production architecture requires a database that can scale across nodes.',
    intro: 'Spanner is a distributed database with SQL and transactional consistency. Use its relational model when application workflows need coordinated updates across related records.',
    typicalUses: ['Transactional order and inventory systems', 'Relational applications using GoogleSQL or PostgreSQL'],
    example: { title: 'Commit an order and its inventory change', steps: ['Create order and inventory tables.', 'Update inventory and insert an order in one transaction.', 'Read both records and verify the committed result.'] },
    reference: 'https://cloud.google.com/spanner',
    examples: [{ title: 'Create a database and query a row', href: '/docs/sdk-examples/#spanner-python', install: 'google-cloud-spanner', label: 'Python', description: 'Apply DDL, insert a fixture, query through the native SDK, and remove owned resources.' }],
  },
  bigquery: {
    whenToUse: 'Use when you need to scan datasets, join analytical tables, and calculate aggregates with SQL. Validate reporting queries and transformation outputs against small local fixtures.',
    intro: 'BigQuery is a SQL analytics warehouse for exploring and transforming datasets. It is designed for reporting, aggregations, and analytical pipelines rather than individual application record updates.',
    typicalUses: ['Analytics and business reporting', 'SQL transformations and model experiments'],
    example: { title: 'Validate a daily revenue query', steps: ['Create a dataset and load small order fixtures.', 'Group revenue by day using GoogleSQL.', 'Assert the totals before running the pipeline on larger data.'] },
    reference: 'https://docs.cloud.google.com/bigquery/docs/introduction',
    examples: [{ title: 'Run a deterministic GoogleSQL query', href: '/docs/sdk-examples/#bigquery-deterministic-query', install: 'google-cloud-bigquery', label: 'Python', description: 'Configure the REST endpoint and anonymous credentials, then query a hello-world message.' }],
  },
  sheets: {
    whenToUse: 'Use when an application consumes small, human-maintained lookup tables through A1 ranges. Seed read-only spreadsheet fixtures locally to test how those rows are interpreted.',
    intro: 'Google Sheets exposes spreadsheet data through an API. LocalCloud provides a read-only values API for testing applications that consume tabular fixtures.',
    typicalUses: ['Spreadsheet-backed lookup data', 'Deterministic fixtures for data consumers'],
    example: { title: 'Read a configured lookup range', steps: ['Seed a spreadsheet and an exact A1 range.', 'Request that range with values.get or values.batchGet.', 'Check the returned rows in the consuming application.'] },
    reference: 'https://developers.google.com/workspace/sheets/api/guides/concepts',
  },
  secretmanager: {
    whenToUse: 'Use when applications retrieve credentials or sensitive configuration at runtime, and values need versioning or rotation independently of an application release.',
    intro: 'Secret Manager stores versioned sensitive values such as API keys and passwords. Applications retrieve a chosen secret version instead of embedding values in source code.',
    typicalUses: ['Application configuration secrets', 'Versioned credential rollouts'],
    example: { title: 'Load a versioned application secret', steps: ['Create a secret containing a fake local value.', 'Add a version and retrieve its payload.', 'Disable that version and verify the application handles the failure.'] },
    reference: 'https://docs.cloud.google.com/secret-manager/docs/overview',
  },
  cloudtasks: {
    whenToUse: 'Use when a known handler should process queued work with controlled dispatch rates, scheduled delivery, and per-task retry behavior.',
    intro: 'Cloud Tasks queues work for later delivery to a handler. Rate limits, retries, and scheduling help control how background requests reach application workers.',
    typicalUses: ['Deferred HTTP work', 'Rate-limited background processing'],
    example: { title: 'Dispatch a background HTTP task', steps: ['Create a queue with a dispatch rate and retry policy.', 'Enqueue a request for a local HTTP handler.', 'Inspect attempts and verify the handler completes the work.'] },
    reference: 'https://docs.cloud.google.com/tasks/docs/dual-overview',
  },
  cloudscheduler: {
    whenToUse: 'Use when work must recur on a cron schedule in a chosen time zone, with an HTTP endpoint or messaging target receiving each scheduled trigger.',
    intro: 'Cloud Scheduler runs jobs on a cron schedule. It triggers HTTP endpoints or messaging targets for recurring application work.',
    typicalUses: ['Scheduled reports and maintenance', 'Recurring HTTP or Pub/Sub triggers'],
    example: { title: 'Trigger a recurring maintenance handler', steps: ['Create an HTTP job with a cron schedule and time zone.', 'Run it manually against a local handler.', 'Inspect the execution history and retry behavior.'] },
    reference: 'https://docs.cloud.google.com/scheduler/docs/overview',
  },
  cloudfunctions: {
    whenToUse: 'Use when a small handler processes an HTTP request or event and can run as an independently invoked function. Locally, test routing to your own running handler.',
    intro: 'Cloud Functions runs functions in response to HTTP requests or events. LocalCloud stores function metadata and routes supported invocations to a handler you run locally.',
    typicalUses: ['HTTP function handlers', 'Pub/Sub-triggered application logic'],
    example: { title: 'Exercise an HTTP function handler', steps: ['Run the handler in your own local process.', 'Register function metadata with its execution target.', 'Invoke through LocalCloud and assert the handler response.'] },
    reference: 'https://docs.cloud.google.com/functions/docs/concepts/overview',
  },
  alloydb: {
    whenToUse: 'Use when an application depends on PostgreSQL SQL, drivers, and transactions, and its production deployment targets AlloyDB. Exercise resource provisioning alongside SQL application tests locally.',
    intro: 'AlloyDB is Google Cloud’s PostgreSQL-compatible database service. LocalCloud combines AlloyDB resource metadata with a local PostgreSQL connection for application tests.',
    typicalUses: ['PostgreSQL application backends', 'Database provisioning and connection tests'],
    example: { title: 'Provision metadata and query PostgreSQL', steps: ['Create local cluster and instance metadata.', 'Connect the application to the documented PostgreSQL endpoint.', 'Create a table, insert a fixture, and query it back.'] },
    reference: 'https://docs.cloud.google.com/alloydb/docs/overview',
  },
  dataproc: {
    whenToUse: 'Use when a pipeline uses Spark or Hadoop to transform partitioned datasets, and you need to submit jobs or serverless batches through the Dataproc API.',
    intro: 'Dataproc provides managed Spark and Hadoop execution on Google Cloud. LocalCloud runs supported cluster jobs and serverless batches through local Docker runtimes.',
    typicalUses: ['Spark ETL and data transformations', 'Hadoop and batch-processing tests'],
    example: { title: 'Run a small Spark transformation', steps: ['Prepare an input fixture and a Spark job.', 'Submit a supported cluster job or serverless batch locally.', 'Inspect job status and verify the transformed output.'] },
    reference: 'https://docs.cloud.google.com/managed-spark/docs/concepts/clusters-overview',
    examples: [{ title: 'Run Dataproc through local Docker', href: '/blog/run-dataproc-locally-docker/', label: 'Integration', description: 'Execution setup, job lifecycle, and Docker runtime boundaries.' }],
  },
  cloudiam: {
    whenToUse: 'Use when resource access depends on which user or service account is making a request, and policies must be managed and tested as part of provisioning.',
    intro: 'Identity and Access Management connects principals, roles, and permissions to resources. It defines who can perform which actions in a Google Cloud project.',
    typicalUses: ['Role and service-account provisioning', 'Policy-aware application tests'],
    example: { title: 'Check a local allow policy', steps: ['Create a test service account and custom role.', 'Store an allow policy on a supported resource.', 'Exercise a documented permission check in the selected IAM mode.'] },
    reference: 'https://docs.cloud.google.com/iam/docs/overview',
  },
  cloudresourcemanager: {
    whenToUse: 'Use when automation needs to create, look up, or delete projects and carry their IDs through resource provisioning. Projects provide the scope for the rest of your setup.',
    intro: 'Resource Manager organizes Google Cloud resources into projects, folders, and organizations. LocalCloud implements documented project lifecycle operations for local provisioning flows.',
    typicalUses: ['Project provisioning', 'Project-scoped test environments'],
    example: { title: 'Create a disposable project', steps: ['Create a project through the supported API.', 'Poll its long-running operation until completion.', 'Read its metadata and remove it after the test.'] },
    reference: 'https://docs.cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy',
  },
  serviceusage: {
    whenToUse: 'Use when provisioning clients check API availability or request service enablement before creating resources. Local preflight responses let you exercise those client flows.',
    intro: 'Service Usage manages which Google APIs and services are enabled for a project. LocalCloud supplies the documented preflight responses used by provisioning clients.',
    typicalUses: ['API enablement preflight checks', 'Provisioning-client compatibility tests'],
    example: { title: 'Test an API enablement preflight', steps: ['Request enablement for a service through the local facade.', 'Poll the returned operation.', 'Verify the response without treating it as runtime service activation.'] },
    reference: 'https://docs.cloud.google.com/service-usage/docs/overview',
  },
  cloudbilling: {
    whenToUse: "Use when provisioning automation needs to discover a billing account or verify a project's billing association. Local tests exercise the metadata flow with test-owned resources.",
    intro: 'Cloud Billing connects projects to billing accounts on Google Cloud. LocalCloud exposes selected account and project billing metadata for provisioning tests.',
    typicalUses: ['Billing-account lookup flows', 'Project billing-link metadata tests'],
    example: { title: 'Check a project’s billing metadata', steps: ['Create the documented local billing metadata.', 'Read or update the project billing association.', 'Verify the returned account and billing-enabled fields.'] },
    reference: 'https://docs.cloud.google.com/billing/docs/how-to/manage-billing-account',
  },
  logging: {
    whenToUse: 'Use when you need searchable records of individual application events, including severity, structured fields, and request IDs for investigating failures.',
    intro: 'Cloud Logging collects and queries structured application logs. It helps developers investigate requests, errors, and resource activity.',
    typicalUses: ['Application log ingestion', 'Request tracing and audit inspection'],
    example: { title: 'Find a failed request in structured logs', steps: ['Write log entries containing severity and a request ID.', 'Query with a supported filter.', 'Check that the expected entry and fields are returned.'] },
    reference: 'https://docs.cloud.google.com/logging/docs/overview',
  },
  monitoring: {
    whenToUse: 'Use when application health is expressed as numeric measurements over time, with labels identifying resources or components. Test metric ingestion and time-window queries with deterministic points.',
    intro: 'Cloud Monitoring stores time-series metrics and supports observability for applications and infrastructure. LocalCloud provides documented metric writes, queries, and configuration metadata.',
    typicalUses: ['Custom application metrics', 'Metric and alert-configuration tests'],
    example: { title: 'Write and query a custom metric', steps: ['Create a metric descriptor for completed requests.', 'Write timestamped points with consistent labels.', 'Query the time interval and verify the returned values.'] },
    reference: 'https://docs.cloud.google.com/monitoring/docs/monitoring-overview',
  },
  gke: {
    whenToUse: 'Use when deployment depends on Kubernetes manifests and APIs, and you need cluster provisioning plus pod readiness checks. Local tests require Docker and k3d.',
    intro: 'Google Kubernetes Engine manages Kubernetes clusters for container workloads. LocalCloud uses k3d to provide a local Kubernetes runtime alongside supported cluster metadata.',
    typicalUses: ['Kubernetes deployment tests', 'Cluster provisioning and readiness checks'],
    example: { title: 'Deploy to a local Kubernetes cluster', steps: ['Create a supported cluster with Docker and k3d available.', 'Connect kubectl using the local cluster configuration.', 'Deploy a test workload and check that its pods become ready.'] },
    reference: 'https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview',
  },
  compute: {
    whenToUse: "Use when a workload needs control over a VM's operating system, attached disks, and network configuration. This scenario currently runs on Google Cloud; local VM execution is planned.",
    intro: 'Compute Engine runs virtual machines with configurable CPU, memory, disks, and networking. Local VM execution is planned for LocalCloud and is not available yet.',
    typicalUses: ['VM-hosted applications', 'Machine-image and infrastructure provisioning'],
    example: { title: 'Example use on Google Cloud', steps: ['Create a VM from a chosen machine image.', 'Run the application and measure its resource use.', 'Stop and delete the VM after testing; LocalCloud cannot run this workflow yet.'] },
    reference: 'https://docs.cloud.google.com/compute/docs/overview',
  },
  cloudrun: {
    whenToUse: 'Use when you can package an HTTP application in a container image and test it through a service URL. LocalCloud runs supported service containers with Docker.',
    intro: 'Cloud Run runs containerized applications behind HTTP endpoints on Google Cloud. LocalCloud runs supported service containers through Docker for local request tests.',
    typicalUses: ['Containerized HTTP APIs', 'Service deployment and update tests'],
    example: { title: 'Deploy and call a containerized API', steps: ['Build a test HTTP application into a container image.', 'Create a local Cloud Run service using that image.', 'Call its endpoint and verify the response after an update.'] },
    reference: 'https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run',
  },
  memorystore: {
    whenToUse: "Use when frequently accessed values, expiring entries, counters, or streams fit Redis commands and an in-memory access model. Choose key names and expiries around the application's cache or queue behavior.",
    intro: 'Memorystore provides managed in-memory data services on Google Cloud. LocalCloud uses a Valkey runtime for documented Redis-compatible commands and instance metadata.',
    typicalUses: ['Application caches and counters', 'Redis-compatible queues and streams'],
    example: { title: 'Test a cache hit and expiry', steps: ['Connect a Redis-compatible client to the local endpoint.', 'SET a test key with an expiry and GET its value.', 'Verify the cache-miss path after the key expires.'] },
    reference: 'https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview',
  },
  workflows: {
    whenToUse: 'Use when a process coordinates several API calls and needs explicit sequencing, branching, retries, and a queryable execution result.',
    intro: 'Workflows orchestrates a sequence of API calls and application steps. It makes retries, branching, and execution state explicit in a workflow definition.',
    typicalUses: ['Multi-step service orchestration', 'HTTP integrations with retry handling'],
    example: { title: 'Coordinate two local HTTP services', steps: ['Deploy a definition using documented HTTP calls and expressions.', 'Start an execution with a small input payload.', 'Inspect step history and verify the returned result.'] },
    reference: 'https://docs.cloud.google.com/workflows/docs/overview',
  },
  vertexai: {
    whenToUse: 'Use when an application calls managed model inference APIs or depends on cloud model-training workflows. Run these against Google Cloud for now; local inference is planned.',
    intro: 'Vertex AI provides model development and AI inference APIs on Google Cloud. Local model execution and inference are planned for LocalCloud and are not available yet.',
    typicalUses: ['Model inference and embeddings', 'Model training and evaluation'],
    example: { title: 'Example use on Google Cloud', steps: ['Call an authorized model with a small test input.', 'Evaluate response quality and latency.', 'Run this against Google Cloud; local stub responses are not model inference.'] },
    reference: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning',
  },
  kms: {
    whenToUse: 'Use when applications encrypt, decrypt, sign, or verify data using managed keys and explicit key versions. Keep cryptographic key lifecycle separate from application payloads.',
    intro: 'Cloud KMS manages cryptographic keys and their versions. Applications use keys to encrypt data, sign messages, or verify authenticity without storing key material in application code.',
    typicalUses: ['Encryption and decryption', 'Signing, MACs, and key lifecycle tests'],
    example: { title: 'Encrypt and decrypt with a software key', steps: ['Create a key ring and an eligible software crypto key.', 'Encrypt a small payload through the KMS API.', 'Decrypt it and assert the original bytes are restored.'] },
    reference: 'https://docs.cloud.google.com/kms/docs/key-management-service',
  },
  cloudsql: {
    whenToUse: 'Use when your application relies on a relational schema, SQL migrations, and transactions through PostgreSQL or MySQL drivers. Test database and user provisioning alongside application queries.',
    intro: 'Cloud SQL is a managed relational database service. LocalCloud exposes supported instance, database, and user APIs with local PostgreSQL and MySQL engines for application tests.',
    typicalUses: ['Relational application backends', 'Database provisioning and migration tests'],
    example: { title: 'Provision a database for application tests', steps: ['Create supported instance metadata, a database, and a user.', 'Connect the application to the selected local SQL engine.', 'Apply a migration and verify a fixture query.'] },
    reference: 'https://docs.cloud.google.com/sql/docs/introduction',
  },
};

export const officialSampleLinks: Readonly<Record<string, string>> = {
  gcs: 'https://docs.cloud.google.com/storage/docs/samples',
  pubsub: 'https://docs.cloud.google.com/pubsub/docs/samples',
  bigtable: 'https://docs.cloud.google.com/bigtable/docs/samples',
  spanner: 'https://docs.cloud.google.com/spanner/docs/samples',
  bigquery: 'https://docs.cloud.google.com/bigquery/docs/samples',
  secretmanager: 'https://docs.cloud.google.com/secret-manager/docs/samples',
  kms: 'https://docs.cloud.google.com/kms/docs/samples',
};

// Reuse the maintained SDK guide so the inline samples and linked guide stay identical.
export function getServiceCodeExamples(serviceId: string, sdkSource: string) {
  return (serviceGuides[serviceId].examples ?? []).filter((example) => example.install).map((example) => {
    const anchor = example.href.split('#')[1];
    const section = sdkSource.split(/^## /m).find((section) =>
      section.split('\n')[0].toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ +/g, '-') === anchor,
    );
    const snippet = section?.match(/```(python|javascript)\n([\s\S]*?)\n```/);
    if (!snippet) throw new Error(`Missing SDK sample: ${example.href}`);
    const isPython = snippet[1] === 'python';
    return {
      ...example,
      code: snippet[2],
      filename: isPython ? 'hello.py' : 'hello.cjs',
      setup: isPython
        ? `python3 -m venv .venv\nsource .venv/bin/activate\npython -m pip install ${example.install}`
        : `npm install ${example.install}`,
      run: isPython ? 'python hello.py' : 'node hello.cjs',
    };
  });
}

// These are the services explicitly listed in the maintained Terraform guide.
export const terraformExampleServiceIds = ['cloudresourcemanager', 'secretmanager', 'cloudtasks', 'cloudsql'];
