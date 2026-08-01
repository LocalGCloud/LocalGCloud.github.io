# OpenCode Install Guidance

Use the canonical skills directly.

## Project install

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

If your OpenCode setup has a configured user skill root, copy the same folders there without renaming them.

## Prompt pattern

> Use `localcloud-sdk-tests` to adapt this repository's GCP SDK tests to LocalCloud localhost endpoints. Do not use mocks or real GCP credentials.

## Compatibility caveat

If native skill discovery is unavailable, instruct OpenCode to read the relevant `SKILL.md` file directly from this repository.
