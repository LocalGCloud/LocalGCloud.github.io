# Contributing

Contributions should preserve the skill package contract.

## Before changing a skill

- Confirm the folder name and `name` frontmatter still match.
- Keep the description trigger-heavy and under 1024 characters.
- Keep required sections from `AGENTS.md`.
- Move long examples to `references/` or `assets/`.
- Link capability claims to LocalCloud docs.

## Safety review

Do not introduce broad tool permission lists, shell auto-approval, production secrets, customer data, service-account keys, billing projects, or production endpoint fallbacks into LocalCloud workflows.

## Release review

Use `RELEASE.md` before publishing a package or marketplace wrapper.
