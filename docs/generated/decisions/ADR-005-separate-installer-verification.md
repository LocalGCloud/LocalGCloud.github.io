# ADR-005: Run installer verification separately from the site build

**Status:** Explicitly accepted; implemented in the manifest and CI; the local fixture command passed in this run.

## Context and alternatives

The user saw doctor/start prompts while building and questioned why the build appeared to involve those operations. The agent explained that installer fixtures simulate interaction and proposed a dedicated test command. The user approved keeping the normal build focused on the site. The earlier alternative placed installer verification in the build command. [REQ-005; E-014 user m668, agent m679, user m680]

## Decision

Expose `test:installer` separately and run it explicitly after the site build in CI. Preserve installer verification rather than removing it. [Source: `package.json:13–17`; `.github/workflows/deploy.yml:33–36`]

## Rationale and consequences

Separate interactive-looking fixture output from site compilation while keeping a release gate. The harness uses synthetic archives, isolated home/PATH and a loopback fixture server, and cleans its temporary root. Its prompts are not proof of a real CLI/Docker startup. [OBS-006; `scripts/verify-installer.mjs:180–260,580–605`]

The fixture suite passed using the private run's temporary directory. Source/dist installer equality also passed, but that one equality check does not establish that the existing dist tree is a current full build. CI and real release downloads were not executed. See [operations](../development-and-operations.md) and [checks](../testing-and-acceptance.md).
