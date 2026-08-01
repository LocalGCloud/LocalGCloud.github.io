# Agentic Community Response Playbook

Use this playbook for launch comments, support replies, GitHub issues, and social threads. The goal is to be useful, transparent, and specific — not to win arguments or amplify unsupported claims.

## Response principles

1. **Disclose affiliation.** Say you work on LocalCloud.
2. **Answer directly.** Acknowledge the concern before linking docs.
3. **Never argue with removals.** If a moderator removes a post, record the reason and do not repost unless invited.
4. **No spam loops.** Reply once with substance; do not chase users across platforms.
5. **No unsupported claims.** Do not invent service behavior, pricing, license terms, roadmap dates, benchmarks, customer names, or production guarantees.
6. **Convert repeated objections.** If the same concern appears three times, create or update a doc, FAQ, compatibility note, skill, MCP guardrail, or product backlog item before the next launch wave.

## Fast facts to use

- LocalCloud is a local Google Cloud emulator for development, testing, CI, and demos.
- Docker image: `jaysen2apache/localcloud`.
- Service breadth: `20+` service surfaces; link `/services/`.
- Default local workflows require no GCP account, credentials, service-account keys, or billing project.
- Standard Google Cloud SDKs route to localhost through emulator environment variables; link `/docs/sdk-examples/`.
- Terraform can be configured against local endpoints; link `/docs/terraform/`.
- Seed data is available for deterministic local runs; link `/docs/seed-data/`.
- Compatibility and gaps are documented at `/compatibility/`.
- Production workloads must be validated against real Google Cloud after unsetting emulator variables.

## Objection routing matrix

| Objection | Short response | Link/action |
|---|---|---|
| “Is this production-ready?” | No. LocalCloud is for development, testing, CI, and demos. Validate against real GCP before production. | `/compatibility/` |
| “Is it 100% compatible with GCP?” | No emulator should be marketed that way. Use the service catalog and compatibility docs to decide which local checks are safe. | `/services/`, `/compatibility/` |
| “Does it require real Google credentials?” | Default local workflows should not require a GCP account, credentials, service-account keys, or billing project. If a workflow asks for them, fix routing instead of proceeding. | `/ai/agents.md`, `/docs/sdk-examples/` |
| “What about security?” | Keep LocalCloud on localhost/private CI networks, use fake seed data/secrets, avoid mounting real credentials, and review Docker/MCP permissions before use. | `/docs/seed-data/`, MCP security docs when available |
| “Why not just use Google’s emulators?” | If Google’s individual emulators cover your workflow, use them. LocalCloud is useful when you want one container, a unified workflow, and service coverage beyond the individual emulator setup. | `/services/` |
| “Is this LocalStack for GCP?” | It solves a similar local-development category problem for GCP, but do not imply affiliation with LocalStack. Describe it as LocalCloud, a local GCP emulator. | `/compatibility/` |
| “How is this different from a generic sandbox?” | Generic sandboxes run code. LocalCloud provides localhost GCP service endpoints for SDK/Terraform workflows. Some teams may use both. | `/docs/sdk-examples/`, `/docs/terraform/` |
| “Will this reduce our bill?” | Default local dev/test calls do not hit billable Google Cloud APIs. Do not promise a specific savings number without measuring the team’s workflow. | Measurement ledger/backlog |
| “What services are missing?” | Link the service catalog and compatibility page; do not guess. Planned services should not be used as launch proof. | `/services/`, `/compatibility/` |
| “Can it run in CI?” | Yes as a local container/sidecar pattern when Docker and ports are available; wait for health and export env vars before tests. | `/docs/`, `/docs/terraform/` |
| “What if an agent tries real GCP anyway?” | The agent instructions must tell it to stop if localhost routing is unavailable. MCP tools and skills should enforce endpoint checks where possible. | `/ai/agents.md` |

## Detailed reply templates

### Compatibility

```text
You’re right to ask about compatibility. LocalCloud is an emulator for dev/test/CI/demo workflows, not a promise of 100% production parity. The safest path is to match your services against the catalog and known gaps, then validate production behavior against real Google Cloud before release:

- Services: https://local.cloud/services/
- Compatibility: https://local.cloud/compatibility/
```

### Credentials and billing

```text
Default LocalCloud workflows are designed to run without a GCP account, Google credentials, service-account keys, or a billing project. SDKs should be pointed at localhost via emulator env vars. If a test starts asking for real credentials, that is a routing problem to fix — not a step to continue through.

SDK examples: https://local.cloud/docs/sdk-examples/
Agent guide: https://local.cloud/ai/agents.md
```

### Docker and local permissions

```text
LocalCloud is Docker-based, so the machine or CI runner needs Docker and the required local ports. For a safe launch demo, keep it bound to localhost/private CI, do not mount real cloud credentials, and use fake seed data.

Seed data docs: https://local.cloud/docs/seed-data/
```

### MCP permissions

```text
For MCP/client integrations, treat Docker/container controls as privileged local operations. Tools should use explicit confirmations for destructive actions, avoid shell-string command execution, bound logs/output, and verify localhost endpoints before running SDK checks. If that guardrail is missing, it belongs in the MCP backlog before broader promotion.
```

### Pricing/licensing

```text
The public positioning we can safely state is: LocalCloud is free for developers, and default local workflows avoid GCP billing because they target localhost instead of real cloud APIs. I’m not going to invent enterprise pricing or long-term license terms in a thread; we’ll keep public docs updated when those details are formalized.
```

### LocalStack comparison

```text
LocalStack is AWS-focused. LocalCloud is focused on Google Cloud workflows. The practical question is whether your team needs local GCP service endpoints, SDK routing, Terraform endpoint overrides, and compatibility coverage for the services you use.

Services: https://local.cloud/services/
Compatibility: https://local.cloud/compatibility/
```

### Generic sandbox comparison

```text
Generic code sandboxes and LocalCloud solve different layers. A sandbox gives an agent a place to run code; LocalCloud gives that code localhost GCP service endpoints. For agent-written tests, the useful pattern is often both: run code in a controlled environment and point GCP SDK calls at LocalCloud.
```

## Conversion workflow for repeated objections

1. **Log every objection** in `agentic-economy-ledger-template.csv` with platform, URL, objection category, exact wording, and response URL.
2. **Cluster daily** during launch week: compatibility, credentials, Docker permissions, MCP permissions, LocalStack comparison, generic sandbox comparison, pricing/licensing, production validation, missing service.
3. **Threshold:** if an objection appears three times in a week, assign an owner and a target artifact.
4. **Choose artifact:**
   - Compatibility gap → `/compatibility/` or `/services/` update.
   - Setup confusion → `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, or `/docs/seed-data/` update.
   - Agent safety issue → `/ai/agents.md`, skill spec, or MCP guardrail.
   - Product capability request → product backlog.
   - Platform listing confusion → directory asset or release checklist update.
5. **Close the loop:** reply to the original thread only if the community allows it and the reply is useful; otherwise record the doc/backlog link in the ledger.

## Escalation rules

| Situation | Action |
|---|---|
| Security concern involving credentials, Docker socket, or exposed ports | Stop promotional replies; route to maintainer/security owner. |
| Claim that docs are inaccurate | Verify against source docs and fix controllable pages before debating. |
| Moderator warning/removal | Thank the moderator if appropriate, stop posting, record removal reason. |
| User reports service behavior mismatch | Ask for minimal repro, service, SDK language, env vars, LocalCloud image tag, and expected GCP behavior; route to issue/backlog. |
| User requests production guarantees | Restate production boundary and validation requirement. |

## Daily launch response review

- [ ] All comments with questions have useful replies or are intentionally skipped by rule.
- [ ] Removals and moderator feedback are recorded.
- [ ] Repeated objections are clustered.
- [ ] New docs/backlog items are linked in the ledger.
- [ ] No reply introduced unsupported claims.
- [ ] Any credentials/security concern was escalated.
