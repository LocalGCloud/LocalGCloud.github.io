# Service emulator comparisons

The public workspace is `/compare/emulators/`. Service tabs on the left select a
shared detail pane on the right; on mobile the tabs sit above the content. Service
guides link to `?service=<slug>`, and Back/Forward restores the selection. Existing
standalone service comparison URLs remain available, including without JavaScript.
Use LocalCloud service names in the
headings and table columns. Keep introductions and configuration notes concise;
review dates and detailed provenance remain in the source records.

The initial HTML and Markdown twin contain a small advantage preview. On entry,
the browser loads only the selected service's build-hashed inventory and displays every matching row on
one page. The existing filters search the complete inventory without pagination.
JSON data and source references appear in the For agents audience only.

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
Markdown previews and agent JSON views to preserve the bounded reading corpus.
