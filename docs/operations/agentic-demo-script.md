# Agentic Demo Script and Transcript

Use this as the narrated launch demo for Show HN, Product Hunt, conference clips, and community replies. It is an asset script and example transcript; replace placeholders with a real rehearsal transcript after running `agentic-launch-rehearsal.md`.

## Demo objective

Show that a coding agent can use LocalCloud as a local Google Cloud sandbox for a narrow SDK/API check without needing a real GCP account, Google credentials, service-account keys, or a billing project.

## Required disclaimers

- LocalCloud is for personal uses permitted by its proprietary license; employer, organization, commercial, shared-team, and team-CI use is excluded.
- LocalCloud is not a production Google Cloud replacement.
- Some service behavior is partial or planned; check `/services/` and `/compatibility/`.
- Validate production workloads against real Google Cloud before deployment.

## Two-minute video script

| Time | Visual | Narration |
|---|---|---|
| 0:00-0:10 | Title slide: “Local GCP sandbox for coding agents” | “This is LocalCloud: a local Google Cloud emulator for permitted personal learning, evaluation, and non-commercial projects.” |
| 0:10-0:25 | Terminal with Docker pull/run command | “It starts from one Docker image: `jaysen2apache/localcloud`.” |
| 0:25-0:35 | Health endpoint | “Before an agent runs SDK code, it waits for the local health endpoint.” |
| 0:35-0:50 | Env export command | “The app keeps using standard Google Cloud SDKs; emulator variables point those SDKs at localhost.” |
| 0:50-1:10 | Agent prompt in coding agent | “The prompt explicitly tells the agent not to use real GCP credentials and to stop if localhost is unavailable.” |
| 1:10-1:30 | One local SDK/API smoke check | “Now the agent runs one narrow local check. This should target localhost, not a real cloud project.” |
| 1:30-1:45 | Web console | “The local console shows service state and logs for inspection.” |
| 1:45-2:00 | Compatibility page | “This is not production parity. Check compatibility and validate against real Google Cloud before production.” |

## Command track

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

## Agent prompt track

```text
Fetch https://local.cloud/ai/agents.md and follow it to start LocalCloud, wait for health, export emulator environment variables, and run one local GCP SDK/API smoke check. Do not use a real GCP account, Google credentials, service-account keys, a billing project, or production Google Cloud endpoints. If the local emulator is unavailable, stop and report the local failure.
```

## Example transcript format

This is a format template, not observed run evidence.

```text
Narrator: We start by pulling the canonical LocalCloud image.
Terminal: docker pull jaysen2apache/localcloud
Terminal: <pull output>

Narrator: LocalCloud runs as one Docker container with service ports exposed locally.
Terminal: docker run -d ... jaysen2apache/localcloud
Terminal: <container-id>

Narrator: The agent waits for the local health endpoint before running SDK code.
Terminal: curl -f http://localhost:8080/_localcloud/health
Terminal: <health response>

Narrator: Now we export emulator variables so standard GCP SDKs use localhost.
Terminal: eval "$(curl -s http://localhost:8080/_localcloud/env?format=shell)"
Terminal: env | grep -E 'EMULATOR_HOST|GOOGLE_CLOUD_PROJECT'
Terminal: <localhost emulator variables>

Narrator: The agent runs one narrow local SDK/API check. No real GCP account, credentials, service-account key, or billing project is used.
Terminal: <local SDK/API smoke check>
Terminal: <success output>

Narrator: LocalCloud is limited to uses permitted by its proprietary license. Check licensing and compatibility, then validate against real Google Cloud before production.
Browser: https://local.cloud/compatibility/
```

## Post-demo checklist

- [ ] Real transcript captured in the launch tracker.
- [ ] No credentials, tokens, customer data, private project IDs, or billing pages appear on screen.
- [ ] The SDK/API check target is localhost.
- [ ] The video links `/docs/`, `/docs/sdk-examples/`, `/services/`, and `/compatibility/`.
- [ ] Any confusing moment is logged as an objection or docs issue in the measurement ledger.
