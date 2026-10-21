# Prompt: Cloud Storage comparison, machine-readable export and failing test

Paste into an agent session in the `localcloud-fake-gcs-server` repository. Read `README.md`
in this folder first (the document contract and working rules).

---

You own `docs/upstream-comparison.md`, which compares upstream fake-gcs-server and the LocalCloud
fork (`gcs-server-extended`) with **production Google Cloud Storage** across 227 capability rows
with stable IDs (`B01`, `O01`, `G09`, ...). It is already the cleanest of the five documents: the
totals table reproduces exactly and no row lacks an ID. Two things remain.

## 1. Machine-readable rows

The document is edited by hand. Add `docs/upstream-comparison.csv` (`id, area, capability,
upstream, fork, limit`) and a small script with a `--check` mode (and a test) that fails when the
table, the "Capability counts" table and the CSV disagree. Use the same marks (`✓ ◐ ✗`) as the
document. The site reads the Markdown today; the CSV lets the importer stop depending on table
layout.

## 2. Keep the limit column about limits

The "Implementation evidence / gap" column mixes link labels (for example `[Routes][routes]`) with
the sentence that matters. Write each row as `limit sentence. Evidence: links`, so the limit can be
published without removing links, and drop the placeholder "source evidence" (20 rows): say what the
source shows or leave it out.

## 3. The failing host-matching test

The document says `TestPublicHostMatchingPublishedPorts` (`fakestorage/server_test.go`, around lines
1553-1576) fails on five loopback-alias and hostname-case expectations, "as in the earlier review".
A known red test undermines every "implemented" mark near it. Reproduce it with the toolchain the
module requires, then either fix the host matching or correct the five expectations (whichever is
wrong) and re-run the race and vet suite. Update "Validation boundaries" to the new result.

## Done when

The check script and the suite pass, and the document's validation paragraph reflects the real
result. Commit with a message that says what changed in the comparison. Do not push.
