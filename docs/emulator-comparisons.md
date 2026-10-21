# Service emulator comparisons

The public hub is `/compare/emulators/`. Five service comparisons use a shared
table and their service guides link to them. The initial HTML and Markdown twin
contain an advantage preview, scope, baseline and links to the full inventories.
The browser loads the complete, build-hashed JSON inventory on first interaction,
then filters all rows and displays 10 at a time. The no-script fallback offers
complete inventory and source-document downloads.

Only **Available locally + Not available/Accepted, no effect upstream** qualifies
for the advantages filter. Scoped upstream behavior has a separate filter.
Unknown and not-applicable values never imply a competitor gap. Firestore retains
compatibility and extended-profile values; the latter requires its documented
configuration and is not a production-deployment claim.

## Updating evidence

Commit comparison documents in their owning upstream repositories first, then run:

```sh
python3 scripts/sync-emulator-comparisons.py /path/to/local_cloud_dependencies
node --test scripts/verify-emulator-comparisons.test.mjs
```

After building, `pnpm run test:comparisons` also exercises the tables in Chrome.

The importer accepts the five supplied inventories, including all three BigQuery
documents. It rejects uncommitted inputs and unknown markers, retains row-level
source locations, and publishes original source bytes inside JSON documents with
SHA-256 digests and repository revisions. Update reviewed dates, baseline labels,
scope notes and expected counts deliberately when the source review changes.
Builds consume checked-in data and never depend on sibling repositories for these
tables. Dataset URLs are immutable Vite assets, retained by the existing asset
manifest workflow. Source-document JSON is also build-hashed, so an open page
retains matching evidence across deployments.

Inventory counts have different denominators and overlapping facets. Do not sum
them into a product feature count or present them as a benchmark. Source and test
references do not qualify a released image or establish a new runtime result.
The comparison hub belongs in `llms-full.txt`; detailed tables have individual
Markdown previews and full JSON downloads to preserve the bounded reading corpus.
