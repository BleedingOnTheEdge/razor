# Razor Deployment & CI/CD Pipelines

This directory contains production deployment and continuous integration workflow definitions for Razor:

- `ci.yml`: Unified matrix verification across .NET 10 core solution (all 1,206 tests), Nx Next.js frontends (`cloud-dashboard` and `marketplace` lint/test/build), and documentation graph validation (`docs-map validate`).
- `cd.yml`: Release container packaging, staging deployment, and production verification smoke test workflow.

## Activation in GitHub Actions

To install these workflows into GitHub Actions, copy them to `.github/workflows/`:

```bash
cp deploy/workflows/*.yml .github/workflows/
git add .github/workflows/
git commit -m "ci: activate unified ci and cd workflows"
git push origin <branch>
```
*(Note: Requires a personal access token or OAuth app with `workflow` scope enabled).*
