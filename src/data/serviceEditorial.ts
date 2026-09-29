import type { DocumentationServiceContract } from './docs-contract.ts';

export type ServiceCategory =
  | 'storage'
  | 'databases'
  | 'analytics'
  | 'integration'
  | 'security'
  | 'operations'
  | 'compute'
  | 'auxiliary';

export interface ServiceEditorial {
  slug: string;
  category: ServiceCategory;
  iconId: string;
  description: string;
}

const editorial = {
  gcs: { slug: 'cloud-storage', category: 'storage', iconId: 'gcs', description: 'Bucket and object lifecycle workflows for local SDK and API development.' },
  pubsub: { slug: 'pubsub', category: 'integration', iconId: 'pubsub', description: 'Topic, subscription, publish, pull, and acknowledgement workflows.' },
  firestore: { slug: 'firestore', category: 'databases', iconId: 'firestore', description: 'Document CRUD, query, and collection workflows. Disabled by default to save resources; enable when needed.' },
  bigtable: { slug: 'bigtable', category: 'databases', iconId: 'bigtable', description: 'Row mutation, read, table administration, and PostgreSQL-backed data workflows.' },
  spanner: { slug: 'spanner', category: 'databases', iconId: 'spanner', description: 'Spanner data and administration workflows over gRPC and REST.' },
  bigquery: { slug: 'bigquery', category: 'analytics', iconId: 'bigquery', description: 'Dataset, table, query, scripting, and API workflows.' },
  sheets: { slug: 'google-sheets', category: 'auxiliary', iconId: 'sheets', description: 'Auxiliary read-only values lookup API for BigQuery external tables and fixture seeding, selected by exact A1 range.' },
  secretmanager: { slug: 'secret-manager', category: 'security', iconId: 'secretmanager', description: 'Secret and version lifecycle workflows for local development.' },
  cloudtasks: { slug: 'cloud-tasks', category: 'integration', iconId: 'cloudtasks', description: 'Queue and task lifecycle workflows.' },
  cloudscheduler: { slug: 'cloud-scheduler', category: 'integration', iconId: 'cloudscheduler', description: 'Schedule and job lifecycle workflows.' },
  cloudfunctions: { slug: 'cloud-functions', category: 'compute', iconId: 'cloudfunctions', description: 'Second-generation function control-plane workflows.' },
  alloydb: { slug: 'alloydb', category: 'databases', iconId: 'alloydb', description: 'AlloyDB cluster and instance control-plane workflows.' },
  dataproc: { slug: 'dataproc', category: 'analytics', iconId: 'dataproc', description: 'Dataproc cluster and job workflows in serverless and cluster modes with Docker execution.' },
  cloudiam: { slug: 'cloud-iam', category: 'security', iconId: 'cloudiam', description: 'IAM policy API workflows for local development.' },
  cloudresourcemanager: { slug: 'cloud-resource-manager', category: 'operations', iconId: 'cloudresourcemanager', description: 'Project lifecycle workflows for local development.' },
  serviceusage: { slug: 'service-usage', category: 'operations', iconId: 'serviceusage', description: 'Service enablement and metadata workflows.' },
  cloudbilling: { slug: 'cloud-billing', category: 'operations', iconId: 'cloudbilling', description: 'Billing-account, budget, and cost metadata workflows.' },
  logging: { slug: 'cloud-logging', category: 'operations', iconId: 'logging', description: 'Log ingestion, listing, metrics, and sink workflows.' },
  monitoring: { slug: 'cloud-monitoring', category: 'operations', iconId: 'monitoring', description: 'Time-series, metric-descriptor, alerting, and dashboard workflows.' },
  gke: { slug: 'gke', category: 'compute', iconId: 'gke', description: 'Pro cluster workflows with opt-in k3d runtime integration.' },
  compute: { slug: 'compute-engine', category: 'compute', iconId: 'compute', description: 'Compute Engine application integration is currently unsupported; consult its operation boundaries.' },
  cloudrun: { slug: 'cloud-run', category: 'compute', iconId: 'cloudrun', description: 'Pro service and revision workflows with host-runtime integration.' },
  memorystore: { slug: 'memorystore', category: 'databases', iconId: 'memorystore', description: 'Valkey-backed RESP data workflows.' },
  workflows: { slug: 'cloud-workflows', category: 'integration', iconId: 'workflows', description: 'Workflow deployment and execution workflows.' },
  vertexai: { slug: 'vertex-ai', category: 'compute', iconId: 'vertexai', description: 'Vertex AI application integration is currently unsupported; consult its operation boundaries.' },
  kms: { slug: 'cloud-kms', category: 'security', iconId: 'kms', description: 'Pro key-management and cryptographic workflows.' },
  cloudsql: { slug: 'cloud-sql', category: 'databases', iconId: 'cloudsql', description: 'Local control-plane and MySQL data-plane workflows.' },
} as const satisfies Record<string, ServiceEditorial>;

export const serviceEditorial: Readonly<Record<string, ServiceEditorial>> = editorial;

export function getServiceEditorial(service: DocumentationServiceContract): ServiceEditorial {
  const value = serviceEditorial[service.id];
  if (!value) throw new Error(`Missing editorial overlay for LocalCloud service ${service.id}`);
  return value;
}
