# Cursor Install Guidance

Cursor can consume these skills as project context even when native marketplace packaging is not used.

## Project install

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

Add a short project rule or instruction telling Cursor to read `.agents/skills/<skill>/SKILL.md` when a prompt mentions LocalCloud, GCP emulators, Terraform validation, seed data, CI sidecars, BigQuery, Pub/Sub, or SDK tests.

## Compatibility caveat

Skill discovery depends on the user's Cursor configuration. Keep this repo vendored if native skill roots are unavailable.

## Safety

Do not add broad command allowlists. Cursor should inspect project scripts and ask before running commands that are not already project-specific.
