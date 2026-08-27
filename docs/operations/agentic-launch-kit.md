# Agentic Economy Launch Kit

Use this kit for community launches of LocalCloud as a local Google Cloud sandbox. Keep every claim tied to current product facts: LocalCloud is a local GCP emulator with 27 available service guides, uses standard GCP SDKs pointed at localhost, requires no GCP account or production credentials for default local workflows, is limited by its proprietary license, and must be validated against real Google Cloud before production.

## Canonical links

| Asset | URL |
|---|---|
| Website | `https://local.cloud/` |
| Agent guide | `/ai/agents.md` |
| Documentation | `/docs/` |
| SDK examples | `/docs/sdk-examples/` |
| Terraform guide | `/docs/terraform/` |
| Seed data guide | `/docs/seed-data/` |
| Service catalog | `/services/` |
| Compatibility and limitations | `/compatibility/` |
| GitHub | `https://github.com/LocalStack-Google/localcloud-site` |
| Docker image | `jaysen2apache/localcloud` |
| Demo script | `agentic-demo-script.md` |
| Asset templates | `agentic-launch-asset-templates.md` |

## Runnable demo

```bash
docker pull jaysen2apache/localcloud

docker run -d -p 8080:8080 -p 4443:4443 -p 8085-8087:8085-8087 \
  -p 9010:9010 -p 9020:9020 -p 9050:9050 -p 9060:9060 -p 6379:6379 \
  -m 4g --name localcloud \
  -v ~/.localcloud/data:/var/lib/localcloud \
  jaysen2apache/localcloud

curl -f http://localhost:8080/_localcloud/health
eval "$(curl -s http://localhost:8080/_localcloud/env?format=shell)"
```

Then run one local SDK example from `/docs/sdk-examples/`, or ask an agent to follow the copyable prompt below. If Docker is unavailable or the health check fails, stop and troubleshoot locally; do not fall back to real GCP.

## Copyable launch prompt

```text
Fetch https://local.cloud/ai/agents.md and follow it exactly. Start or reuse the LocalCloud Docker container, wait for http://localhost:8080/_localcloud/health, export emulator environment variables from http://localhost:8080/_localcloud/env?format=shell, and run one narrow local GCP SDK/API smoke check against localhost. Do not ask for or use a real GCP account, Google credentials, service-account keys, or a billing project. If LocalCloud is not healthy, stop and report the local failure instead of calling real Google Cloud.
```

## Demo story arc

1. **Problem:** Agent-written integration tests often need GCP APIs, but defaulting to real projects introduces credentials, billing, IAM setup, network dependency, and shared-state risk.
2. **LocalCloud setup:** Pull `jaysen2apache/localcloud`, start one container, wait for health, and export localhost SDK variables.
3. **Agent workflow:** Give the agent `/ai/agents.md`; it reads the guardrails, checks Docker, starts or reuses LocalCloud, and runs a local SDK smoke test.
4. **Inspect:** Open `http://localhost:8080` to inspect service state and logs.
5. **Boundary:** Link `/docs/licensing/` and say plainly: LocalCloud is limited to permitted personal use; employer, organization, commercial, shared-team, and team-CI use is excluded. Validate against real GCP before production.

## CLI transcript template

This is a script template for rehearsals and recordings, not proof that a run happened.

```text
$ docker pull jaysen2apache/localcloud
Using default tag: latest
...

$ docker run -d ... jaysen2apache/localcloud
<container-id>

$ curl -f http://localhost:8080/_localcloud/health
{"status":"ok", ...}

$ eval "$(curl -s http://localhost:8080/_localcloud/env?format=shell)"

$ env | grep -E 'EMULATOR_HOST|GOOGLE_CLOUD_PROJECT'
PUBSUB_EMULATOR_HOST=localhost:8085
FIRESTORE_EMULATOR_HOST=localhost:8086
STORAGE_EMULATOR_HOST=http://localhost:4443
BIGQUERY_EMULATOR_HOST=http://localhost:9050
GOOGLE_CLOUD_PROJECT=local-project

$ <run one SDK smoke check from /docs/sdk-examples/>
<local API call succeeds against localhost>
```

## Screenshots and video shot list

| Shot | Capture | Caption |
|---|---|---|
| 1 | Terminal pulling and starting the Docker image | “One container: `jaysen2apache/localcloud`.” |
| 2 | Health endpoint returning ready | “Agents wait for local readiness before SDK calls.” |
| 3 | Env export output | “Standard SDKs are routed to localhost.” |
| 4 | Agent prompt pasted into a coding agent | “The agent is told not to use real GCP credentials.” |
| 5 | SDK smoke check output | “A GCP workflow runs locally.” |
| 6 | Web console at `http://localhost:8080` | “Inspect local service state without a cloud account.” |
| 7 | `/compatibility/` | “Known limitations are documented before production validation.” |

Keep the video under two minutes for Product Hunt and under five minutes for technical posts. Do not show real customer data, cloud credentials, billing pages, or production project IDs.

## Compatibility matrix for launch assets

| Area | Safe launch claim | Required caveat/link |
|---|---|---|
| Runtime | LocalCloud runs as a Docker container. | Link `/docs/`; mention Docker and local ports are required. |
| Service breadth | LocalCloud publishes 27 available Google Cloud service guides. | Link `/services/`; avoid saying every GCP service or operation is supported. |
| SDKs | Standard Google Cloud SDKs can target localhost through emulator env vars. | Link `/docs/sdk-examples/`; do not imply production parity. |
| Terraform | Terraform workflows can be pointed at local endpoints. | Link `/docs/terraform/`; validate real infrastructure separately. |
| Seed data | Seed data can make local runs deterministic. | Link `/docs/seed-data/`; use fake secrets only. |
| Credentials | Default local workflows do not need a GCP account, credentials, or billing project. | If a user config calls real GCP, stop and fix routing instead of using secrets. |
| Production and permission | LocalCloud is for personal uses permitted by its proprietary license and is not a production replacement. | Link `/docs/licensing/` and `/compatibility/`; validate against real Google Cloud before production. |

## Limitations language

Use this language in every launch surface:

> LocalCloud is not a production Google Cloud replacement. Its proprietary license permits only specified personal uses and excludes employer, organization, commercial, shared-team, and team-CI use. Some service behavior is partial; check `/compatibility/`, `/services/`, and `/docs/licensing/`. Before production deployment, unset emulator variables and validate the workload against real Google Cloud.

## Launch asset checklist

- [ ] Runnable demo commands use `jaysen2apache/localcloud`.
- [ ] Prompt tells agents not to use real GCP credentials.
- [ ] Demo records localhost endpoints and health readiness.
- [ ] Post links `/compatibility/`, `/services/`, `/docs/`, `/docs/sdk-examples/`, `/docs/terraform/`, and `/docs/seed-data/` where relevant.
- [ ] Screenshot/video captions do not claim 100% compatibility, production parity, or unaudited pricing/licensing terms.
- [ ] A maintainer is assigned to comments for the first 24 hours.
- [ ] Every post URL and repeated objection is entered in `agentic-economy-ledger-template.csv`.
