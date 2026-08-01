# Security Policy

## Scope

This repository contains instruction-first Agent Skills for LocalCloud. Skills may include copyable shell snippets, CI YAML, or seed examples, but they do not grant broad tool permissions and do not require real Google Cloud credentials.

## Report a vulnerability

Report security concerns through the LocalCloud project security channel or by opening a private advisory in the owning repository when available. Include:

- affected skill or metadata file
- unsafe instruction, command, or claim
- expected safer behavior
- whether real credentials, production endpoints, or destructive actions could be reached

## Safety expectations

- Default LocalCloud workflows use localhost endpoints and no GCP account, credentials, service-account key, or billing project.
- Agents must stop and ask when repo context does not reveal the needed test command, service, language, or CI provider.
- Agents must not fall back to real Google Cloud during local validation.
- Production validation happens only after emulator variables are unset and the user intentionally configures real Google Cloud.

## Supported versions

Security fixes apply to the current skill set in `skills/` and any current client metadata under `metadata/`.
