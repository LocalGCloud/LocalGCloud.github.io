// Presentation layer for the documentation contract.
//
// src/data/docs-contract.snapshot.json mirrors the upstream verification ledgers byte
// for byte (scripts/verify-upstream-docs.mjs checks that), so its prose carries QA
// vocabulary: evidence tags such as "[partial]", classification counts, capability-ID
// prefixes, commit SHAs, local evidence paths and "qualification remains pending"
// notes. Readers and agents get capability and verify-with statements instead
// (AGENTS.md section 1). Astro reads the contract through src/data/docs-contract.ts and
// scripts/generate-distributed-docs.mjs reads the raw JSON; both pass it through
// presentContract(), and scripts/verify-content-facts.mjs fails the build if any of
// this vocabulary still reaches a published page.
//
// Two mechanisms, applied in this order:
// 1. Sentence rewrites (REWRITES): whole QA sentences that carry a fact become a
//    capability or verify-with statement. Facts stay exact; only the framing changes.
// 2. Token stripping and drops: tags, classification parentheticals, capability-ID
//    prefixes, SHAs and evidence paths are removed, and any clause that is only a QA
//    status note (DROP) is dropped.
// Plain JavaScript so Astro and Node scripts share it.

const SHA = /\b[0-9a-f]{40}\b/g;
const IMAGE_DIGEST = /\s*\(sha256:[0-9a-f]{64}\)/g;
// "[partial] ", "[prod_only] " at the start of an upstream limitation.
const EVIDENCE_TAG = /^\s*\[[a-z_]+\]\s*/i;
// "(1 partial [schema.queues], 8 accepted-no-op, 9 production-only exclusions, ...)".
const CLASSIFICATION_PARENTHETICAL = /\s*\((?=[^()]*\b(?:partial|accepted-no-op|production-only exclusions?)\b)[^()]*\)/gi;
// "sql.ddl.partition-by: semantic-compatibility:Ingestion-time ..." and
// "managed-authorization:...|distributed-scale:...": an optional capability ID, then a
// hyphenated classification kind glued to the sentence it labels.
const CAPABILITY_PREFIX = /^\s*(?:[a-z0-9]+(?:[.-][a-z0-9]+)+:\s+)?[a-z]+(?:-[a-z]+)+:(?=[A-Z])/;
const CAPABILITY_SEPARATOR = /\|(?=[a-z]+(?:-[a-z]+)+:[A-Z])/;
// A short dependency commit such as "dd5f9e7" (at least one digit, so words stay).
const SHORT_COMMIT = "(?=[0-9a-f]*\\d)[0-9a-f]{7}";

/** @type {Array<[RegExp, string]>} */
const REWRITES = [
	// Bigtable: the dependency's short commit is a version detail, not copy.
	[new RegExp(`\\bThe pinned little_bigtable ${SHORT_COMMIT} \\(v([\\d.]+)\\)`, "g"), "The pinned little_bigtable v$1"],
	[new RegExp(`\\bThe ${SHORT_COMMIT} executable ledger\\b`, "g"), "The executable ledger"],
	[new RegExp(`(^|\\. )${SHORT_COMMIT} backups\\b`, "g"), "$1Backups"],
	[new RegExp(`(^|\\. )${SHORT_COMMIT} (?=[a-z])`, "g"), "$1The emulator "],
	[/That evidence is for the dependency source, not LocalCloud\./g, "Those tests cover the dependency source, not the LocalCloud image."],
	[/The [^.]*?\bcandidate \(sha256:[0-9a-f]{64}\) embeds this revision and completed platform testing with two failing Bigtable cases \(project deletion and backup listing\)\./g, "Confirm project deletion and backup listing through the native admin API."],
	[/the candidate project-deletion failure leaves LocalCloud cleanup unverified/g, "confirm project cleanup through the native admin API"],
	[/The candidate backup-listing failure leaves integration unverified\./g, "Confirm backup listing through the native admin API."],
	[/a dedicated LocalCloud Sink platform scenario is pending/g, "validate Sink filters in your own test suite"],
	[/PostgreSQL restart durability in the LocalCloud image is pending/g, "validate PostgreSQL restart durability in your own test suite"],
	[/Not re-run against little_bigtable [0-9a-f]{7}: its pinned cbt conformance test was skipped because cbt was not installed, so this rests on earlier evidence until the LocalCloud image is qualified\./g, "The pinned cbt conformance test was skipped because cbt was not installed; validate cbt scripts in your own test suite."],
	[/Dependency identity, restart recovery, and the assembled LocalCloud image remain release-unverified\./g, "Test restart recovery with the exact LocalCloud image you run."],
	// Cloud Storage.
	[/Real-Google and object-conditional grant qualification remain pending/g, "Validate real-Google and object-conditional grants against Google Cloud"],
	[/Finalize, metadata-update and delete delivery are live-container qualified/g, "Finalize, metadata-update and delete events are delivered in the local container"],
	[/real-Google gcp-live impersonation is not qualified/g, "validate real-Google gcp-live impersonation against Google Cloud"],
	[/are production-only and excluded from developer completeness/g, "are cloud-only"],
	[/Local live-container HTTP qualification includes ([^.]+)\. These fixes require a rebuilt image; trusted release-image and full LocalCloud TLS qualification remain pending\./g, "Live-container HTTP tests cover $1; these fixes need an image built from current source. Validate TLS behavior in your own tests."],
	// Pub/Sub, Firestore and persistence notes.
	[/\bqualify the exact replay and redelivery workflow/g, "test the exact replay and redelivery workflow"],
	[/Composite-index enforcement, transaction concurrency, listeners and transforms require exact-artifact qualification\./g, "Validate composite-index enforcement, transaction concurrency, listeners and transforms with the exact image you run."],
	[/Security Rules evaluation and Firestore-trigger delivery remain unqualified local capabilities\./g, "Security Rules evaluation and Firestore-trigger delivery aren't yet validated locally."],
	[/Historical isolated clean-restart evidence restored document contents but changed timestamps\. Qualify recovery in the exact assembled image\./g, "In isolated tests, a clean restart restored document contents but changed timestamps. Test recovery with the exact image you run."],
	// Spanner.
	[/Production-only infrastructure exclusions (\([^)]*\)) do not apply to local development\./g, "Cloud-only infrastructure $1 does not apply to local development."],
	// BigQuery.
	[/Coverage classifications are source records, not proof of full Google Cloud semantic parity or assembled-image qualification\./g, "Coverage records describe the emulator source; validate the semantics your application depends on."],
	[/Review the dependency matrix, including partial and unsupported records; qualify semantics and errors with application queries\./g, "Review the dependency coverage matrix, and test semantics and errors with your application queries."],
	// Other services.
	[/a local identity\/authorization contract has not been qualified/g, "validate identity and authorization against Google Cloud"],
	[/\bremains partial\b/g, "is limited"],
	[/\bremain partial\b/g, "are limited"],
	[/this does not qualify every cron expression/g, "this does not cover every cron expression"],
	[/destination delivery, filtering, retry and failure behavior require separate qualification/g, "validate destination delivery, filtering, retry and failure behavior separately"],
	[/Uptime execution and dashboards are not qualified local capabilities/g, "Uptime execution and dashboards aren't yet validated locally"],
	[/have bounded implementations and tests; complete Google connector\/runtime parity remains unverified/g, "have limited implementations and tests; validate Google connector/runtime parity against Google Cloud"],
	[/broader connector\/runtime parity remains unverified/g, "validate broader connector/runtime parity against Google Cloud"],
	[/SOFTWARE cryptography and lifecycle have recorded exact-candidate qualification\. The [^.]*?\bcandidate \(sha256:[0-9a-f]{64}\) passed ([^.]+)\. This is bounded candidate evidence; it does not qualify a published release or additional architectures\./g, "SOFTWARE cryptography and lifecycle passed $1 on an arm64 test build. Validate published releases and other architectures with your own tests."],
	[/production hardware\/authority guarantees are excluded, not pending LocalCloud implementation/g, "production hardware/authority guarantees are cloud-only"],
	[/Native TLS is not qualified\./g, "Validate native TLS settings in Google Cloud."],
	// Product, CLI and Terraform.
	[/The repository agrees across the reviewed runtime launcher and CLI, but the mutable latest tag has no qualified assembled-image digest\./g, "The latest tag is mutable; pin an image digest when repeatability matters."],
	[/LocalCloud emulates bounded local development workflows\./g, "LocalCloud runs local versions of Google Cloud services for development and testing."],
	[/CLI ([\d.]+) behavior is documented from the current sibling source snapshot\./g, "This documentation describes CLI $1."],
	[/Resource support is bounded to maintained qualification evidence\./g, "Resource support is limited to the documented, tested resources."],
];

// A clause that is only a QA status note is dropped. Checked after REWRITES.
const DROP = [
	/\bqualif(?:y|ied|ication|ications)\b/i,
	/\bunqualified\b/i,
	/\brelease-unverified\b/i,
	/\bremains? (?:open|pending|unverified)\b/i,
	/\bis pending\b/i,
	/\bcandidate\b/i,
	/\bvalidation: partial\b/i,
	/\baudit correction\b/i,
	/\binventory anchor\b/i,
	/\bfirst-pass\b/i,
	/\bcensus\b/i,
	/\bdevelopment_status\b/i,
	/local-evidence\//i,
	/\bare historical\b/i,
	/\bversioning is a separate development gap\b/i,
	/\bSource digests identify working-tree changes\b/i,
	/^Derived (?:compatibility detail|parent)\b/i,
];

const capitalize = (text) => text.replace(/^[a-z]/, (letter) => letter.toUpperCase());
const isDropped = (clause) => DROP.some((pattern) => pattern.test(clause));

/** Rewrite one contract string for readers; returns "" when nothing reader-facing remains. */
export function presentContractText(text) {
	if (typeof text !== "string") return text;
	let value = text.replace(EVIDENCE_TAG, "");
	for (const [pattern, replacement] of REWRITES) value = value.replace(pattern, replacement);
	value = value
		.split(CAPABILITY_SEPARATOR)
		.map((part) => part.replace(CAPABILITY_PREFIX, "").trim())
		.map((part, index, parts) => (parts.length > 1 && !/[.!?]$/.test(part) ? `${part}.` : part))
		.join(" ")
		.replace(IMAGE_DIGEST, "")
		.replace(CLASSIFICATION_PARENTHETICAL, "")
		.replace(SHA, "");
	// Sentences, then semicolon clauses within each sentence.
	const sentences = value
		.split(/(?<=[.!?])\s+(?=[A-Z0-9`'"(*])/)
		.map((sentence) => {
			const terminal = sentence.match(/[.!?:]$/)?.[0] ?? "";
			const clauses = (terminal ? sentence.slice(0, -1) : sentence).split(/;\s+/).map((clause) => clause.trim());
			const kept = clauses.filter((clause) => clause && !isDropped(clause));
			if (!kept.length) return "";
			// Only a sentence that lost its opening clause needs a new capital letter.
			const joined = kept.join("; ");
			return `${kept[0] === clauses[0] ? joined : capitalize(joined)}${terminal}`;
		})
		.filter(Boolean);
	// Close gaps left by removed tokens, but keep an ellipsis such as "SELECT ... FOR UPDATE".
	return sentences.join(" ").replace(/\s{2,}/g, " ").replace(/\s+([,;:]|\.(?!\.))/g, "$1").trim();
}

/** Rewrite a list of contract strings, dropping empty and repeated entries. */
export function presentContractList(items) {
	if (!Array.isArray(items)) return items;
	return [...new Set(items.map(presentContractText).filter(Boolean))];
}

/**
 * A copy of the contract whose prose fields are reader copy. Identifiers, enums and
 * evidence paths are unchanged, so code that branches on status still works.
 * @template T
 * @param {T} contract
 * @returns {T}
 */
export function presentContract(contract) {
	const value = structuredClone(contract);
	for (const service of value.services ?? []) {
		service.limitations = presentContractList(service.limitations);
		for (const operation of service.operations ?? []) operation.limitations = presentContractList(operation.limitations);
		if (service.persistence) {
			service.persistence.restartBehavior = presentContractText(service.persistence.restartBehavior);
			service.persistence.recoveryLimitations = presentContractList(service.persistence.recoveryLimitations);
		}
		if (service.assembledDefault) service.assembledDefault.limitation = presentContractText(service.assembledDefault.limitation);
	}
	if (value.product) {
		value.product.productionBoundary = presentContractText(value.product.productionBoundary);
		if (value.product.runtimeImage) value.product.runtimeImage.limitation = presentContractText(value.product.runtimeImage.limitation);
	}
	if (value.cli) value.cli.releaseBoundary = presentContractText(value.cli.releaseBoundary);
	for (const section of [value.seed, value.terraform, value.privacy, value.licensing, value.privacy?.runtimeTelemetry]) {
		if (section?.limitations) section.limitations = presentContractList(section.limitations);
	}
	for (const capability of value.bigqueryCoverage?.partialCapabilities ?? []) {
		capability.boundary = presentContractText(capability.boundary);
		capability.notes = presentContractText(capability.notes);
	}
	return value;
}
