export type CompatibilityStatus = 'supported' | 'partial' | 'planned' | 'unsupported';

export interface Evidence {
  source: string;
  reviewedAt: string;
  reviewer: string;
}

export const productFacts = {
  name: 'LocalCloud',
  siteUrl: 'https://local.cloud/',
  githubUrl: 'https://github.com/LocalGCloud/LocalGCloud.github.io',
  dockerImage: 'jaysen2apache/localcloud',
  logoUrl: 'https://local.cloud/brand/localcloud-mark.svg',
  serviceCountLabel: '20+',
  availabilityStatement: 'Free for developers.',
  licensingPath: '/docs/licensing/',
  category: 'Local Google Cloud emulator',
  description:
    'LocalCloud runs major Google Cloud services locally in one Docker container for development, testing, CI, and demos. Standard Google Cloud SDKs connect through local endpoints instead of real cloud services.',
  productionBoundary:
    'LocalCloud is for local development, testing, CI, and demos. Validate against real Google Cloud before production deployment.',
  evidence: {
    source: 'Approved LocalCloud product direction and current site/runtime documentation',
    reviewedAt: '2026-06-22',
    reviewer: 'LocalCloud product direction',
  } satisfies Evidence,
} as const;

export type JsonLd = Record<string, unknown>;

export const organizationSchema: JsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: productFacts.name,
  url: productFacts.siteUrl,
  logo: productFacts.logoUrl,
  description: productFacts.description,
  sameAs: [productFacts.githubUrl],
};

export const createSoftwareApplicationSchema = (url: string, description: string): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: productFacts.name,
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: productFacts.category,
  operatingSystem: 'Docker',
  url,
  description,
  downloadUrl: `https://hub.docker.com/r/${productFacts.dockerImage}`,
  license: new URL(productFacts.licensingPath, productFacts.siteUrl).toString(),
});

export const createBreadcrumbSchema = (
  items: ReadonlyArray<{ name: string; url?: string }>,
): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    ...(item.url ? { item: item.url } : {}),
  })),
});
