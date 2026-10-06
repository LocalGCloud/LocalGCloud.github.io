import { availableServiceCount } from "./services.ts";

// How LocalCloud compares with other local options for Google Cloud development.
//
// Every fact about a named product was checked against the official source it links, on
// the review date below. Re-check them all when you change reviewedAt;
// scripts/verify-content-facts.mjs warns once the review is older than 120 days. No
// prices: describe plans, not amounts. LocalCloud cells link the site page that documents
// the fact. Community emulators are one generic category: no project names, no links.

export const alternativesReviewedAt = "2026-10-05";

export interface ComparisonSource {
	label: string;
	href: string;
}

export interface ComparisonCell {
	text: string;
	sources: ComparisonSource[];
}

export type ComparisonRowId = "services" | "bigqueryStorage" | "runtime" | "data" | "license" | "cost";

export interface ComparisonRow {
	id: ComparisonRowId;
	label: string;
}

export interface Alternative {
	id: "localcloud" | "gcloud" | "firebase" | "localstack" | "community";
	name: string;
	shortName: string;
	// A generic category (community emulators): no named projects and no source links.
	generic?: boolean;
	cells: Record<ComparisonRowId, ComparisonCell>;
}

export const comparisonRows: ComparisonRow[] = [
	{ id: "services", label: "Google Cloud services" },
	{ id: "bigqueryStorage", label: "BigQuery and Cloud Storage" },
	{ id: "runtime", label: "How services run" },
	{ id: "data", label: "Data across restarts" },
	{ id: "license", label: "License" },
	{ id: "cost", label: "Cost and sign-up" },
];

const source = (label: string, href: string): ComparisonSource => ({ label, href });
const sources = {
	gcloudEmulators: source("gcloud beta emulators reference", "https://docs.cloud.google.com/sdk/gcloud/reference/beta/emulators"),
	gcloudInstall: source("Install the Google Cloud CLI", "https://docs.cloud.google.com/sdk/docs/install-sdk"),
	pubsubEmulator: source("Pub/Sub emulator", "https://docs.cloud.google.com/pubsub/docs/emulator"),
	spannerEmulator: source("Cloud Spanner emulator", "https://github.com/GoogleCloudPlatform/cloud-spanner-emulator"),
	firebaseSuite: source("Firebase Local Emulator Suite", "https://firebase.google.com/docs/emulator-suite"),
	firebaseInstall: source("Install and configure the emulators", "https://firebase.google.com/docs/emulator-suite/install_and_configure"),
	firebaseTools: source("firebase-tools", "https://github.com/firebase/firebase-tools"),
	localstackPricing: source("LocalStack pricing", "https://www.localstack.cloud/pricing"),
	localstackAuth: source("LocalStack single-image announcement", "https://blog.localstack.cloud/localstack-single-image-next-steps/"),
};
const site = {
	services: source("Service catalog", "/services/"),
	compatibility: source("Compatibility", "/compatibility/"),
	architecture: source("Architecture", "/docs/architecture/"),
	license: source("License", "/license/"),
	pricing: source("Pricing", "/pricing/"),
};

export const alternatives: Alternative[] = [
	{
		id: "localcloud",
		name: "LocalCloud",
		shortName: "LocalCloud",
		cells: {
			services: { text: `${availableServiceCount} Google Cloud services in one Docker container`, sources: [site.services] },
			bigqueryStorage: { text: "Both, alongside Pub/Sub, Spanner, Firestore and the rest of the stack", sources: [site.compatibility] },
			runtime: {
				text: "Google's Firestore emulator, a Spanner emulator built from Google's open-source emulator, PostgreSQL and MySQL for Cloud SQL, Valkey for Memorystore, and a DuckDB-backed BigQuery",
				sources: [site.architecture],
			},
			data: { text: "Stored in a named Docker volume that survives restarts", sources: [site.architecture] },
			license: { text: "Proprietary Public Preview License", sources: [site.license] },
			cost: { text: "Free during the public preview, with no account or license key; open-source projects stay free after it", sources: [site.pricing] },
		},
	},
	{
		id: "gcloud",
		name: "Google Cloud CLI emulators",
		shortName: "Google emulators (gcloud)",
		cells: {
			services: { text: "Five: Bigtable, Datastore, Firestore, Pub/Sub and Spanner, each started on its own", sources: [sources.gcloudEmulators] },
			bigqueryStorage: { text: "No BigQuery or Cloud Storage emulator", sources: [sources.gcloudEmulators] },
			runtime: { text: "Google-built emulators installed as Google Cloud CLI components", sources: [sources.gcloudInstall] },
			data: { text: "Pub/Sub keeps data for the emulator session; the Spanner emulator keeps data in memory only", sources: [sources.pubsubEmulator, sources.spannerEmulator] },
			license: { text: "Google tooling; the Spanner emulator is open source (Apache-2.0)", sources: [sources.spannerEmulator] },
			cost: { text: "Installed with the Google Cloud CLI", sources: [sources.gcloudInstall] },
		},
	},
	{
		id: "firebase",
		name: "Firebase Local Emulator Suite",
		shortName: "Firebase emulators",
		cells: {
			services: {
				text: "Firebase products: Firestore, Realtime Database, Cloud Storage for Firebase, Authentication, Hosting, Cloud Functions, Pub/Sub and Extensions",
				sources: [sources.firebaseSuite],
			},
			bigqueryStorage: { text: "No BigQuery; Cloud Storage for Firebase only", sources: [sources.firebaseSuite] },
			runtime: { text: "Started together by the Firebase CLI", sources: [sources.firebaseInstall] },
			data: { text: "Export on exit and import on the next start", sources: [sources.firebaseInstall] },
			license: { text: "Open source (MIT)", sources: [sources.firebaseTools] },
			cost: { text: "Free to use under its open-source license", sources: [sources.firebaseTools] },
		},
	},
	{
		id: "localstack",
		name: "LocalStack",
		shortName: "LocalStack",
		cells: {
			services: { text: "None; LocalStack covers AWS and Snowflake", sources: [sources.localstackPricing] },
			bigqueryStorage: { text: "No", sources: [sources.localstackPricing] },
			runtime: { text: "One container image for AWS services", sources: [sources.localstackAuth] },
			data: { text: "Not applicable to Google Cloud", sources: [sources.localstackPricing] },
			license: { text: "Proprietary plans; current releases need an account and auth token since March 23, 2026", sources: [sources.localstackAuth] },
			cost: { text: "Free Hobby plan for non-commercial use; paid plans for commercial use", sources: [sources.localstackPricing] },
		},
	},
	{
		// A category, not a product: describe it generically, without naming or linking projects.
		id: "community",
		name: "Single-service community emulators",
		shortName: "Community emulators",
		generic: true,
		cells: {
			services: { text: "Typically one Google Cloud service each, such as BigQuery or Cloud Storage", sources: [] },
			bigqueryStorage: { text: "Separate projects, one per service", sources: [] },
			runtime: { text: "Independent open-source reimplementations; coverage and fidelity vary by project", sources: [] },
			data: { text: "Varies by project", sources: [] },
			license: { text: "Open-source licenses that vary by project", sources: [] },
			cost: { text: "Free", sources: [] },
		},
	},
];

// The homepage FAQ shows these rows and columns; /compare/ shows everything.
export const compactRowIds: ComparisonRowId[] = ["services", "bigqueryStorage", "data", "license", "cost"];
export const compactAlternativeIds: Alternative["id"][] = ["localcloud", "gcloud", "localstack", "community"];

const reviewedLabel = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
	.format(new Date(`${alternativesReviewedAt}T00:00:00Z`));
export const alternativesReviewedLabel = reviewedLabel;

// One plain-language answer, shared by the homepage FAQ (and its FAQPage JSON-LD) and llms.txt.
export const comparisonSummary = [
	`LocalStack emulates AWS and Snowflake, not Google Cloud; teams on both clouds run both.`,
	`Google ships separate emulators for Bigtable, Datastore, Firestore, Pub/Sub and Spanner through the Google Cloud CLI, and the Firebase Local Emulator Suite for Firebase products. The Google Cloud CLI has no BigQuery or Cloud Storage emulator.`,
	`Single-service community emulators typically cover one Google Cloud service each, such as BigQuery or Cloud Storage; coverage and fidelity vary by project.`,
	`LocalCloud runs ${availableServiceCount} Google Cloud services, including BigQuery and Cloud Storage, in one Docker container, using Google's Firestore emulator and a Spanner emulator built from Google's open-source emulator.`,
];
