# Codex Install Guidance

Use `metadata/codex-plugin.json` as package metadata and keep canonical instructions in `skills/`.

## Project-local install

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

Ask Codex to load a skill explicitly:

> Use `localcloud-ci-sidecar` to prepare a GitHub Actions LocalCloud service for this repo.

## Compatibility notes

- Prefer project-local `.agents/skills/` for reproducibility.
- Do not configure broad shell auto-approval.
- Let Codex inspect the repo and ask only when project context cannot reveal the test command, language, or CI provider.
