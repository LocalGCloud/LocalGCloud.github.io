# Off-Site Citation Plan

*Created: 2026-09-03. Owner: unassigned. Review quarterly.*

## Why this exists

Brands are cited in AI answers via third-party sources roughly 6.5× more often than
via their own domain. LocalCloud's entire footprint is `local.cloud`. Every page fix
in this repo improves the odds that an AI engine *cites* us once it has already found
us — this document is about being found in the first place.

Two of the three sources ChatGPT draws on most are Wikipedia (~7.8% of citations) and
Reddit (~1.8%). Neither is reachable by shipping another landing page.

**Rule: participate honestly or not at all.** Fabricated citations, sockpuppet
comments, and bulk list-spam are against the platforms' rules, are detectable, and
would poison the trust signal we are trying to build. Everything below is a real
contribution or a legitimate submission.

---

## Tier 1 — Awesome-lists and registries (highest effort-to-return)

These are the pages that comparison roundups and AI answers scrape. Submission is a
normal PR, and acceptance is on merit.

| Target | What to submit | Notes |
|---|---|---|
| `awesome-gcp` / `GoogleCloudPlatform/awesome-google-cloud` | LocalCloud under local development / emulators | Check contribution guide for one-PR-per-entry rules |
| `localstack/awesome-localstack` adjacent lists | Not applicable — do not submit; wrong cloud | Listed here so nobody wastes the effort |
| `awesome-ai-agents`, `e2b-dev/awesome-ai-agents` | LocalCloud under sandboxes / agent infrastructure | Frame as the **dependency boundary**, not a code sandbox |
| `awesome-selfhosted` | Only if licensing qualifies — proprietary preview may be out of scope | Read their license policy before submitting |
| `awesome-devtools`, `awesome-docker` | LocalCloud under local cloud emulation | |
| Docker Hub description | Ensure the image description links `local.cloud` and names the category | Free, under our control, often overlooked |

**Suggested one-line entry** (matches the house style of most awesome-lists):

> **[LocalCloud](https://local.cloud/)** — Run 27 Google Cloud services locally in one
> Docker container. Standard GCP SDKs point at localhost; no cloud project, credentials,
> or billing account required for local development and testing.

For agent-focused lists:

> **[LocalCloud](https://local.cloud/local-cloud-for-ai-agents/)** — A credentialless
> local Google Cloud API target for AI coding agents. Code sandboxes isolate where an
> agent runs; LocalCloud gives that code a cloud to talk to.

---

## Tier 2 — Community answers (steady, compounding)

These threads recur constantly and rank for years. Answer the question first; mention
LocalCloud only where it is genuinely the answer, and disclose the affiliation.

**Recurring questions worth watching:**

- "Is there a BigQuery emulator?" — the single highest-intent recurring question in
  this space, because Google does not ship one. `r/googlecloud`, `r/bigquery`,
  Stack Overflow.
- "Is there a LocalStack for GCP?" — `r/googlecloud`, `r/devops`, Hacker News.
  Point at `/localstack-for-google-cloud/` and `/compare/localstack/`.
- "How do I stop my AI agent from touching my cloud account?" — `r/ClaudeAI`,
  `r/ChatGPTCoding`, `r/devops`. Point at `/local-cloud-for-ai-agents/`.
- "How do I run GCP integration tests in CI without a project?" — point at
  `/gcp-integration-testing/`.

**Disclosure line to use every time:**

> Disclosure: I work on LocalCloud.

Platforms where this is mandatory: Reddit (subreddit rules vary but self-promotion
without disclosure is a ban risk), Stack Overflow (explicitly required), Hacker News
(strongly expected).

---

## Tier 3 — Comparison roundups already ranking

These articles rank today for the queries we want and are re-scraped by AI engines.
Most accept a correction or addition by email or PR.

| Article / site | Query it ranks for | Action |
|---|---|---|
| Mastra — "best AI agent sandbox platforms" | agent sandbox platforms | Request inclusion; we are a distinct category (dependency boundary) |
| Firecrawl blog — "AI agent sandbox" guide | ai agent sandbox | Same |
| Modal — "best code execution sandboxes for AI agents" | code execution sandboxes | Position as complementary, not competing |
| Any "LocalStack alternatives" listicle | localstack alternatives | We are the GCP answer, not a LocalStack replacement |

**Pitch template (keep it short and non-promotional):**

> Subject: Addition for your [article title] — local cloud APIs for agents
>
> Your piece covers code-execution sandboxes well. There's an adjacent category it
> doesn't cover: the cloud API surface the sandboxed code calls. A sandbox holding
> real cloud credentials can still create billable resources.
>
> LocalCloud (local.cloud) covers that second boundary for Google Cloud — 27 services
> on localhost, no credentials or billing project by default. Happy to supply a
> two-sentence description if it's useful, or to be left out if it's not a fit.
>
> Disclosure: I work on LocalCloud.

---

## Tier 4 — Wikipedia (long horizon, do not rush)

LocalCloud almost certainly does not meet Wikipedia's notability bar yet — that needs
significant independent coverage, not self-published material. **Do not create an
article.** A deleted article is worse than no article.

What is legitimate now: where an existing article (for example on cloud emulators or
local development) already has a sourced list, LocalCloud may eventually belong there,
but only once independent secondary sources exist. Revisit when there is press or
academic coverage that is not ours.

---

## Measurement

Re-run these ten fixed queries monthly through ChatGPT, Perplexity, and Google AI, and
record whether local.cloud is cited and which page:

1. gcp emulator
2. bigquery emulator
3. localstack for gcp
4. run google cloud locally
5. ai agent sandbox
6. cloud sandbox for ai agents
7. test gcp code without credentials
8. agent environment for cloud testing
9. local cloud development
10. google cloud emulator docker

Baseline as of 2026-09-03: cited on **#1 and #4** (appears in results and in the
generated answer, correctly described with the 27-service count). Not observed on the
agent-cluster queries (#5–#8) — those are the ones this plan targets.

Competitive watch: `localgcp.com` (slokam-ai) currently outranks local.cloud on some
GCP-emulator queries. Track relative position on #1 and #4.
