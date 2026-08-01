# Install LocalCloud Agent Skills

The portable default is to copy canonical skill folders into a project-local skill root:

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

Use the install matrix for client-specific notes:

- [Install matrix](install/matrix.md)
- [Claude](install/claude.md)
- [Codex](install/codex.md)
- [GitHub Copilot](install/github-copilot.md)
- [Cursor](install/cursor.md)
- [OpenCode](install/opencode.md)

Do not rename skill folders. Folder names must match `name` frontmatter in each `SKILL.md`.
