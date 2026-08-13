import snapshot from './docs-contract.snapshot.json' with { type: 'json' };

export type EvidenceState = 'verified' | 'partial' | 'release-unverified' | 'unsupported' | 'unknown';
export type ServiceTier = 'community' | 'pro';
export type ServiceProtocol = 'rest' | 'grpc' | 'redis';
export type ServiceRuntimeType = 'external' | 'facade';
export type PersistenceScope = 'volatile' | 'metadata' | 'service-data' | 'stateless';
export type ServiceImplementation =
  | 'google-official'
  | 'extended-official'
  | 'custom-emulator'
  | 'third-party-emulator'
  | 'local-facade';

export interface QualifiedImage {
  repository: string;
  tag: string;
  digest: string | null;
  qualification: EvidenceState;
  evidence: string[];
  limitation: string;
}

export interface EvidenceBoundRecord {
  id: string;
  description: string;
  evidence: string[];
}

export interface OperationContract {
  id: string;
  label: string;
  status: EvidenceState;
  limitations: string[];
  evidence: string[];
}

export interface PersistenceContract {
  scope: PersistenceScope;
  backingStore: string;
  restartBehavior: string;
  recoveryLimitations: string[];
  qualification: EvidenceState;
  evidence: string[];
}

export interface AssembledDefaultContract {
  enabled: boolean;
  qualification: EvidenceState;
  evidence: string[];
  limitation: string;
}

export interface DocumentationServiceContract {
  id: string;
  name: string;
  port: number;
  additionalPorts: Record<string, number>;
  protocol: ServiceProtocol;
  type: ServiceRuntimeType;
  registryDefaultEnabled: boolean;
  assembledDefault: AssembledDefaultContract;
  minTier: ServiceTier;
  envVar: string;
  envValue: string;
  terraformEnvVar: string | null;
  implementation: ServiceImplementation;
  persistence: PersistenceContract;
  status: EvidenceState;
  operations: OperationContract[];
  limitations: string[];
  evidence: string[];
  published: boolean;
}

export interface DocumentationContract {
  schemaVersion: number;
  reviewedAt: string;
  provenance: {
    runtimeRevision: string;
    cliRevision: string;
    assembledImageDigest: string | null;
    qualification: EvidenceState;
    sources: string[];
    dependencyRevalidations: Array<{
      id: string;
      revision: string;
      qualification: EvidenceState;
      evidence: string[];
    }>;
  };
  product: {
    name: string;
    siteUrl: string;
    runtimeImage: QualifiedImage;
    imageQualification: EvidenceState;
    defaultProject: string;
    defaultUser: string;
    defaultInstance: string;
    memory: string;
    serviceCount: number;
    productionBoundary: string;
  };
  operator: {
    gatewayPort: number;
    publishedPorts: Record<string, string>;
    endpoints: Record<string, string>;
    manualDockerCommand: string;
  };
  cli: {
    installScriptUrl: string;
    installCommand: string;
    homebrewCommand: string;
    supportedHosts: string[];
    requiresDocker: boolean;
    frozenBinaryRequiresPython: boolean;
    commands: string[];
    quickStart: string[];
    doctorSuccessStatus: string;
    startSuccessStatuses: string[];
    dataDefault: string;
    dockerSocketDefault: boolean;
    transparentNetworkDefault: boolean;
    bindAddress: string;
    dynamicPortMapping: boolean;
    environmentFormats: string[];
    integrity: string;
    releaseBoundary: string;
  };
  seed: {
    status: EvidenceState;
    endpoint: string;
    reseedEndpoint: string;
    importEndpoint: string;
    seedFileVariable: string;
    defaultSeedFile: string;
    terraformModeVariable: string;
    acceptedEnvelopes: EvidenceBoundRecord[];
    supportedServices: string[];
    volatileServices: string[];
    limitations: string[];
    evidence: string[];
  };
  terraform: {
    status: EvidenceState;
    readinessEndpoint: string;
    modeVariable: string;
    providerConstraint: string;
    credentialRequirement: string;
    networkModes: Array<EvidenceBoundRecord & { requirements: string[] }>;
    qualifiedResources: string[];
    limitations: string[];
    evidence: string[];
  };
  privacy: {
    status: EvidenceState;
    runtimeTelemetry: {
      defaultEnabled: boolean;
      destination: string;
      disableVariable: string;
      identifier: string;
      retryPersistence: boolean;
      events: string[];
      limitations: string[];
      evidence: string[];
    };
    outboundBehaviors: Array<{
      id: string;
      default: string;
      destination: string;
      control: string;
      evidence: string[];
    }>;
    websiteAnalytics: {
      processor: string;
      events: string[];
      evidence: string[];
    };
    limitations: string[];
    evidence: string[];
  };
  licensing: {
    status: EvidenceState;
    governingLicense: string;
    summary: string;
    permittedUse: string;
    excludedUse: string[];
    commercialLicenseAvailable: boolean;
    technicalEnforcement: {
      developmentBuild: string;
      enforcedBuild: string;
      serviceTiers: string;
      evidence: string[];
    };
    limitations: string[];
    evidence: string[];
  };
  services: DocumentationServiceContract[];
}

function loadDocumentationContract(value: unknown): DocumentationContract {
  if (!value || typeof value !== 'object') {
    throw new Error('Documentation contract snapshot must be an object');
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 2 || !Array.isArray(candidate.services)) {
    throw new Error('Documentation contract snapshot has an unsupported schema');
  }
  return value as DocumentationContract;
}

// The build verifier performs exhaustive structural and semantic validation.
export const docsContract = loadDocumentationContract(snapshot);

export const docsContractServicesById = new Map(
  docsContract.services.map((service) => [service.id, service] as const),
);

export function getDocumentationService(id: string): DocumentationServiceContract {
  const service = docsContractServicesById.get(id);
  if (!service) throw new Error(`Unknown LocalCloud service ID: ${id}`);
  return service;
}
