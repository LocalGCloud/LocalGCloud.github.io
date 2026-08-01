# Agentic Launch Rehearsal Runbook

Purpose: rehearse the launch demo on a clean machine before any community post goes live. The rehearsal verifies the public story is true: an agent can follow `/ai/agents.md`, start LocalCloud, route SDKs to localhost, perform one local GCP operation, and avoid real GCP credentials by default.

Do not use this document as a substitute for an actual rehearsal log. Paste the real run output into the launch issue or measurement ledger after the run.

## Rehearsal rules

- Use a fresh shell with no exported `GOOGLE_APPLICATION_CREDENTIALS`.
- Do not log into `gcloud` during the rehearsal.
- Do not create or reference a real GCP project.
- Use `jaysen2apache/localcloud` as the Docker image.
- If Docker, ports, or LocalCloud health fail, stop and record the local failure. Do not route to real Google Cloud.
- Validate production workloads later against real GCP only after unsetting emulator variables.

## Fresh-machine checklist

| Step | Evidence to capture |
|---|---|
| Confirm Docker is installed and running. | Docker version or UI screenshot. |
| Confirm no GCP credentials are active in the shell. | Empty or intentionally unset `GOOGLE_APPLICATION_CREDENTIALS`; no service-account key path. |
| Pull and start LocalCloud. | `docker pull jaysen2apache/localcloud`; container ID from `docker run`. |
| Wait for readiness. | `curl -f http://localhost:8080/_localcloud/health` output. |
| Export env vars. | `eval "$(curl -s http://localhost:8080/_localcloud/env?format=shell)"`. |
| Run one local SDK/API check. | A small Pub/Sub, Firestore, Cloud Storage, or BigQuery operation against localhost. |
| Inspect state. | Console screenshot from `http://localhost:8080`. |
| Record caveats. | Any service-specific limitations linked to `/compatibility/` or `/services/`. |

## Agent prompt for rehearsal

```text
You are rehearsing a public LocalCloud launch demo. Read https://local.cloud/ai/agents.md. Start or reuse the localcloud Docker container from jaysen2apache/localcloud, wait for http://localhost:8080/_localcloud/health, export the shell env vars from http://localhost:8080/_localcloud/env?format=shell, and run exactly one local GCP SDK smoke check. Do not use a GCP account, gcloud login, GOOGLE_APPLICATION_CREDENTIALS, service-account keys, a billing project, or production Google Cloud endpoints. If a step would require real GCP, stop and explain the local routing issue.
```

## Transcript template

```text
Date:
Machine/OS:
Docker version:
Maintainer:
Agent/client:

$ env | grep -E 'GOOGLE_APPLICATION_CREDENTIALS|CLOUDSDK|GCLOUD|GOOGLE_CLOUD_PROJECT'
<expected: no real credential path; local project only after env export>

$ docker pull jaysen2apache/localcloud
<output>

$ docker run -d -p 8080:8080 -p 4443:4443 -p 8085-8087:8085-8087 \
  -p 9010:9010 -p 9020:9020 -p 9050:9050 -p 9060:9060 -p 6379:6379 \
  -m 4g --name localcloud \
  -v ~/.localcloud/data:/var/lib/localcloud \
  jaysen2apache/localcloud
<container id or already-running note>

$ curl -f http://localhost:8080/_localcloud/health
<health response>

$ eval "$(curl -s http://localhost:8080/_localcloud/env?format=shell)"

$ env | grep -E 'EMULATOR_HOST|GOOGLE_CLOUD_PROJECT'
<local endpoint variables>

$ <one local SDK/API smoke check>
<output proving localhost operation>

$ <open http://localhost:8080 and inspect service state>
<screenshot path or note>

Result:
- Pass/fail:
- Local operation tested:
- Real GCP credential usage observed: none / explain
- Docs gaps found:
- Objections or confusion to add to playbook:
```

## Pass criteria

- The agent used `/ai/agents.md` or equivalent launch prompt.
- The LocalCloud container was started or reused locally.
- Readiness was checked before SDK/API use.
- Emulator variables were exported before the smoke check.
- The smoke check targeted localhost.
- No real GCP credentials, service-account keys, billing project, or production endpoints were required.
- Any limitation encountered is converted into a docs issue, compatibility note, skill update, MCP guardrail, or product backlog item before the next launch wave.
