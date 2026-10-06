import releaseData from "./releases.json" with { type: "json" };
import { productFacts } from "./productFacts.ts";

// Facts the trust strip, /security/ and /changelog/ share. Release data comes from the
// committed src/data/releases.json (scripts/sync-releases.mjs); the build never fetches it.

export interface CliRelease {
	version: string;
	tag: string;
	title: string;
	publishedAt: string;
	prerelease: boolean;
	url: string;
	summary: string;
	platforms: string[];
	checksums: boolean;
	sigstore: boolean;
	homebrewFormula: boolean;
}

export const cliReleases: CliRelease[] = releaseData.releases;
const stableRelease = cliReleases.find((release) => !release.prerelease);
if (!stableRelease) throw new Error("src/data/releases.json has no stable CLI release");
export const latestCliRelease: CliRelease = stableRelease;

const downloadBase = `${productFacts.cliReleasesUrl}/download/${latestCliRelease.tag}`;
// Release workflow identity, confirmed with cosign against the SHA256SUMS bundle of every
// release: the certificate names the cli-release.yml workflow at a version tag.
export const releaseSigningIdentityPattern =
	"^https://github\\.com/LocalGCloud/localcloud-cli/\\.github/workflows/cli-release\\.yml@refs/tags/v";
export const releaseSigningIssuer = "https://token.actions.githubusercontent.com";

export const cosignVerifyCommand = [
	`curl -fsSLO ${downloadBase}/SHA256SUMS`,
	`curl -fsSLO ${downloadBase}/SHA256SUMS.sigstore.json`,
	"cosign verify-blob SHA256SUMS \\",
	"  --bundle SHA256SUMS.sigstore.json \\",
	`  --certificate-identity-regexp '${releaseSigningIdentityPattern}' \\`,
	`  --certificate-oidc-issuer ${releaseSigningIssuer}`,
].join("\n");

// After the signature check, compare a downloaded archive with the signed checksums.
export const checksumVerifyCommand = "sha256sum --check --ignore-missing SHA256SUMS";

export const imageSbomCommand = `docker buildx imagetools inspect ${productFacts.dockerImage} --format '{{ json .SBOM }}'`;
export const imageProvenanceCommand = `docker buildx imagetools inspect ${productFacts.dockerImage} --format '{{ json .Provenance }}'`;
