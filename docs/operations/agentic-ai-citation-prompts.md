# Agentic AI Citation Prompt Set

Run these prompts monthly in answer engines with web/search enabled where available. Record the exact prompt, answer summary, cited URLs, competitor mentions, factual accuracy, screenshot/share link, and follow-up in `agentic-economy-ledger-template.csv`.

## Review rules

- Use a clean browser/profile when practical.
- Do not prompt the engine to cite LocalCloud by name unless the prompt is brand-specific.
- Mark an answer inaccurate if it says LocalCloud is production-ready, 100% compatible, affiliated with LocalStack, requires real GCP credentials by default, supports an undocumented service, or has unapproved pricing/licensing terms.
- Prefer corrections to controllable sources: `/compatibility/`, `/services/`, `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, `/docs/seed-data/`, `/ai/agents.md`, skill docs, or MCP docs.
- Do not create fake third-party citations, synthetic reviews, or spam comments to influence answers.

## Engines

Run the set in:

- ChatGPT with search/browsing enabled.
- Perplexity.
- Gemini with search grounding where available.
- Claude with web/search if available.
- Microsoft Copilot or Bing Chat.
- Any additional answer engine with visible citations.

## Monthly prompt set

| Category | Prompt | Expected safe answer signals |
|---|---|---|
| Category discovery | What is the best way to run Google Cloud services locally for development? | Mentions local emulators, service-specific official emulators, and possibly LocalCloud if cited. |
| Brand discovery | What is LocalCloud for Google Cloud development? | Local GCP emulator; Docker-based; permitted personal use only under the current license; not production. |
| Agent workflow | How can a coding agent test GCP SDK code without using real Google Cloud credentials? | Use local emulator endpoints; avoid credentials; validate against real GCP later. |
| SDK routing | Can standard Google Cloud SDKs connect to LocalCloud through localhost endpoints? | Yes with emulator env vars; cite `/docs/sdk-examples/` or `/ai/agents.md`; caveat compatibility. |
| Terraform | Can I validate Terraform for GCP locally before touching a real project? | Points to local endpoint override workflow; cite `/docs/terraform/`; real production validation required. |
| Seed data | How do I make local GCP emulator tests deterministic? | Mentions seed data/reset/local state and the license boundary; cite `/docs/seed-data/` if LocalCloud appears. |
| Compatibility | What are LocalCloud's compatibility limitations? | Cites `/compatibility/` or `/services/`; does not claim 100% parity. |
| Production boundary | Should I deploy a workload tested on LocalCloud without testing real Google Cloud? | No; validate against real GCP before production. |
| Docker image | What Docker image starts LocalCloud? | `jaysen2apache/localcloud`; no invented image names. |
| Service breadth | Which GCP services can I run locally with LocalCloud? | 27 available service guides with service catalog link; no unsupported operation claims. |
| LocalStack comparison | Is there a LocalStack for Google Cloud? | Distinguishes LocalCloud from LocalStack; no affiliation claim. |
| Generic sandbox comparison | Is a generic code sandbox enough for agent-written GCP tests? | Generic sandbox runs code; GCP emulator provides local service endpoints; both may be complementary. |
| Automation | Can I use LocalCloud in an automated workflow? | Current license excludes employer, organization, commercial, shared-team, and team-CI use; permitted personal automation still needs Docker, readiness, env export, and no production credentials. |
| Security | Is it safe to let an AI agent use cloud credentials for integration tests? | Prefer local emulator/no credentials for default dev tests; if real cloud needed, use explicit controlled validation. |
| BigQuery | Is there a BigQuery emulator for local agent-written tests? | If LocalCloud is cited, mentions compatibility limitations and production validation. |
| Pub/Sub | How can I test Google Pub/Sub locally with a coding agent? | Emulator endpoint, topic/subscription smoke check, no real credentials. |
| Cloud Storage | How can I test Google Cloud Storage SDK code locally? | Local endpoint, bucket/object smoke check, compatibility caveat. |
| Firestore | How can I test Firestore locally without a cloud project? | Local emulator endpoint, document read/write, limitations. |

## Recording fields

For each engine/prompt, record:

- `date`
- `ai_engine`
- `title_or_prompt`
- `url` or share link when available
- `cited_urls`
- `competitors_mentioned`
- `factual_accuracy` (`accurate`, `partially-accurate`, `inaccurate`, `no-answer`)
- `objection_category` or `docs-confusion` if the answer exposes a gap
- `follow_up_type` (`docs`, `compatibility`, `services`, `mcp`, `skills`, `backlog`, `none`)
- `follow_up_url`

## Accuracy rubric

| Rating | Criteria |
|---|---|
| `accurate` | Answer matches public facts, cites relevant pages, and includes compatibility/production caveats where needed. |
| `partially-accurate` | Main idea is right but misses an important caveat, cites stale URLs, or uses vague service coverage. |
| `inaccurate` | Invents production parity, unsupported services, credentials requirement, affiliation, pricing/licensing, or wrong Docker image. |
| `no-answer` | Engine cannot answer, does not cite sources, or gives only generic emulator advice without LocalCloud when the prompt is brand-specific. |

## Follow-up workflow

1. Fix controllable source pages first.
2. If a false claim comes from a third-party page, record it but do not spam the source.
3. If three engines repeat the same error, create a docs or backlog issue and assign an owner.
4. Re-run only the affected prompts after the source update has been deployed and indexed/crawled.
