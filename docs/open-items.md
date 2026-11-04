# Open items

Questions about site copy that need an owner decision. Each one came out of moving the site's documentation contract to localcloud-go on 2026-11-03 (site commit 4bca1f0). The corrected facts are in `src/data/docs-contract.snapshot.json`, but the copy below was left alone on purpose.

## 1. Runtime telemetry copy (privacy and legal wording)

The LocalCloud Go runtime sends no telemetry and ignores `LOCALCLOUD_TELEMETRY` (`runtime-facts.yaml` in localcloud-go's public contract). Only the CLI reports usage (PostHog), and it uses the same opt-out variable. Several pages still say the runtime reports usage:

| File | Claim |
| --- | --- |
| `src/pages/docs/privacy.mdx` | Collects usage and diagnostic details; "Disable telemetry" section; "stops regular runtime and Console reporting" |
| `src/pages/security.astro` | "The runtime sends pseudonymous usage and diagnostic reports" |
| `src/data/homepageFaq.ts` | "The runtime sends pseudonymous usage and diagnostic reports" |
| `src/components/HomepageVariationFieldManual.astro` | "Usage telemetry is pseudonymous and turns off with …" |
| `src/data/faqContent.ts` | "the runtime can also emit telemetry" |
| `src/pages/docs/configuration.mdx` | `LOCALCLOUD_TELEMETRY` row: "Anonymous runtime diagnostic metrics preference" |
| `src/pages/gcp-emulator.astro`, `src/pages/how-to-run-google-cloud-locally.astro` | Telemetry listed among the runtime's outbound requests |

**Decision needed:** rewrite these to say that only the CLI reports usage. The privacy page is legal copy, so it needs the owner's sign-off.

## 2. Terraform facts

The provider version constraint and the list of Terraform resources documented as working are still maintained in the site. They have not been checked against localcloud-go: its public contract records only the readiness route, `LOCALCLOUD_TERRAFORM_MODE` and `/env?format=terraform`.

**Decision needed:** either verify the resource list against the runtime and add it to localcloud-go's public contract, or keep it as site-owned copy.

## 3. Claims written conservatively

The contract migration could not confirm these from the runtime, so the copy was written conservatively. Each one needs a check against a running 0.1.11 before it is stated more strongly:

- Cloud Storage: whether the Storage gRPC API is reachable, and the bucket IAM store.
- Logging: the log-based metric routes.
- GKE: kubeconfig handling.
- Dataproc: the state of a job that a restart interrupts.
- Cloud KMS: how gRPC calls behave in `gcp-live` IAM mode.
- Firestore triggers (Cloud Functions): whether they register while Firestore is disabled.
- Memorystore: whether TLS is served on 5394.

Also: `scripts/sync-emulator-comparisons.py` reads the BigQuery coverage at the repository's HEAD, while the LocalCloud image pins a specific BigQuery commit. They match at 0.1.11 (60db8063), but they can drift between releases.
