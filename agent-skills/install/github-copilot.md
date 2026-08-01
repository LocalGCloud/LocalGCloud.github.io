# GitHub Copilot Install Guidance

## Repository skill install

If your GitHub Copilot workflow supports repository skills, copy the canonical skills into `.github/skills/`:

```bash
mkdir -p .github/skills
cp -R agent-skills/skills/* .github/skills/
```

If not, use the portable path:

```bash
mkdir -p .agents/skills
cp -R agent-skills/skills/* .agents/skills/
```

## GitHub CLI / workflow usage

When invoking Copilot or GitHub CLI driven workflows, reference the exact skill name and point at the copied folder. Example prompt:

> Use `localcloud-terraform` from `.github/skills/` to validate the existing Terraform resources against LocalCloud without real GCP credentials.

## Safety

Do not store service-account keys, production secrets, or billing project IDs in repository skills or examples. CI examples should use LocalCloud localhost endpoints only.
