# Claude Install Guidance

Use the canonical `skills/` directory as the source of truth.

## Project-local install

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

Then ask Claude to use a skill by folder name, for example:

> Use the `localcloud-bigquery` skill to add a BigQuery SDK integration test against LocalCloud.

## Plugin metadata

`metadata/claude-plugin.json` describes this package for Claude-style plugin or marketplace packaging. It references `../skills` and does not duplicate skill bodies.

## Safety

Do not grant broad shell permissions in plugin metadata. LocalCloud commands should remain user-visible and project-scoped, and workflows must not request real GCP credentials.
