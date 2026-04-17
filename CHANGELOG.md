# Changelog

## 0.1.0 (2026-04-17)

### Features

- formo initial commit ([b2efe17](https://github.com/virgenherrera/Cross-UI-Template/commit/b2efe17e8f9f88ea4d5b34cf9e59e1e2e5947e5a))

> **Docs:** [README](README.md) | [AGENTS.md](AGENTS.md) | [Architecture](docs/architecture.md) | [Pipeline](docs/feature-validation-pipeline.md) | [ADRs](docs/adr/) | [CLAUDE.md](CLAUDE.md) | **Changelog**

## Table of Contents

- [Unreleased](#unreleased)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Unified artifact output under `.generated/` (snapshots, reports, diffs, storybook-static)
- 3-app pixel-perfect UI quality pipeline (ui-spec-designer, generate-ui-screens, e2e)
- Storybook 10 visual mold system with viewports, themes, and i18n support
- Playwright RPA screenshot capture for golden PNGs
- Playwright E2E visual regression testing
- Placeholder web app (`apps/web/`) as working pipeline example
- Post-clone init script (`pnpm run init`) for template personalization (bash)
- Dependency update support via npm-check-updates with doctor mode (`pnpm run bumpDependencies`)
- Node.js engine constraint (>=22.0.0 <25) with `engine-strict=true`
- Shared Tailwind v4 design tokens (`shared/styles/theme.css`)
- CI-gate hook blocking commits if `pnpm run test` fails
- Cross-document navigation system across all docs
- Changelog, commit-convention, and storybook-mold skills for AI agents
- Automated release system with release-it, branch-based versioning channels, and unified version sync across all workspace packages

[Back to top](#table-of-contents)

[Unreleased]: https://github.com/user/formo/compare/v0.0.0...HEAD
