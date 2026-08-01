# Install Matrix

| Client | Project install | User/global install | Notes |
| --- | --- | --- | --- |
| Portable / generic agent | Copy `skills/*` to `.agents/skills/` | Vendor this repo and point the agent at `agent-skills/skills/` | Default cross-client path. |
| Claude | Use `metadata/claude-plugin.json` with canonical `skills/`, or copy skills into the workspace skill root your Claude client supports | Use the client-supported user skill/plugin location | Keep namespaced invocation such as `localcloud-bigquery`. |
| Codex | Use `metadata/codex-plugin.json` and copy or vendor `skills/*` into the project | Use the configured user skill root when supported | Do not add broad shell pre-approval; let Codex ask before commands. |
| GitHub Copilot | Copy skills into `.github/skills/` when your Copilot workflow supports repository skills; otherwise use `.agents/skills/` | Use GitHub CLI or user-level workflow support where configured | Keep LocalCloud workflows credentialless by default. |
| Cursor | Copy to `.agents/skills/` and reference skills from project rules/instructions | Use Cursor user rules that point at this repo | Cursor compatibility depends on the user's configured rules/agent features. |
| OpenCode | Copy to `.agents/skills/` or the configured OpenCode skill path | Use OpenCode's configured user skill root when available | Preserve canonical `skills/` names. |

## Portable default

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

## Compatibility caveat

Agent client skill locations evolve. If a client does not support native skill packaging, keep this repository vendored and instruct the agent to read the needed `SKILL.md` directly.
