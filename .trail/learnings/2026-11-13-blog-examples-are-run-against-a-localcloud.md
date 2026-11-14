---
title: Blog examples are run against a throwaway LocalCloud runtime before they are published
author: LocalCloud
date: 2026-11-13
branch: main
cost: { minutes: 25, tokens: 366091 }
id: l-a67ad779
scope: repo
status: active
src: agent
touches:
  - src/components/BlogArticle.astro
  - src/components/BlogCode.astro
  - src/data/blogMetadata.json
  - src/data/blogPosts.ts
  - src/layouts/BlogLayout.astro
  - src/pages/blog/event-driven-pipelines-gcs-pubsub-bigquery.astro
  - src/pages/blog/index.astro
  - src/pages/blog/inside-localcloud-multiplexing-20-services.astro
  - src/pages/blog/local-secrets-kms-without-iam-friction.astro
  - src/pages/blog/localcloud-for-open-source.astro
---

## Decided
- Every command and output shown in a blog walkthrough is run first against a separate LocalCloud runtime, so the post shows real output. Doing this for the November 2026 rewrite found two bugs the old posts would have handed to readers.
- Authored posts share one frame and come in three shapes: Walkthrough (outcome box, steps with output), Perspective (scene, before-and-after table), Deep dive. Titles and summaries live in one place.
- Blog copy may be loose on numbers and use catchy titles, but must not say anything a Google Cloud or Terraform reader would know is wrong.

## Tried and ruled out
- Starting the pipeline example with only Cloud Storage, Pub/Sub and BigQuery: creating a bucket notification fails until the IAM service is enabled too.
- Reading the gateway address from LOCALCLOUD_GATEWAY_URL: that variable does not exist.

## Watch out
- Shell snippets with line-continuation backslashes lose them inside an ordinary template literal and render as one long line.
- Unquoted URLs containing a question mark fail in zsh.
- A stopped test runtime came back up on its own once; check it is really stopped before removing its container and volume.
- Google publishes five emulators (Pub/Sub, Firestore, Datastore, Bigtable, Spanner), not three.

In the code:
- Frame: src/components/BlogArticle.astro, src/components/BlogCode.astro; titles in src/data/blogPosts.ts.
- Test runtime: localcloud start --local-only --data-volume NAME --accept-dynamic-ports, then eval "$(localcloud env --data-volume NAME)".
- Pipeline services: gcs,pubsub,bigquery,cloudiam. Gateway variable: LOCALCLOUD_GATEWAY.
- Use String.raw for shell snippets with backslashes.
