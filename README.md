# my-app

> **Docs:** **README** | [AGENTS.md](AGENTS.md) | [Architecture](docs/architecture.md) | [Pipeline](docs/feature-validation-pipeline.md) | [ADRs](docs/adr/) | [CLAUDE.md](CLAUDE.md) | [Changelog](CHANGELOG.md)

## Table of Contents

- [Description](#description)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Pipeline](#pipeline)
- [Running the Pipeline](#running-the-pipeline)
- [Scripts Reference](#scripts-reference)
- [Releasing](#releasing)
- [Project Structure](#project-structure)
- [Design Tokens](#design-tokens)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)

## Description

my-app is a Cross-UI-Template with a visual quality pipeline. Design screens in Storybook,
generate golden PNG screenshots, then validate your production app matches -- pixel-perfect.

## Prerequisites

### Required

| Tool                | Version   | Install                                                       |
| ------------------- | --------- | ------------------------------------------------------------- |
| Node.js             | >= 22.0.0 | [nodejs.org](https://nodejs.org) or `nvm install --lts`       |
| pnpm                | 10.33.0   | `corepack enable && corepack prepare pnpm@10.33.0 --activate` |
| Playwright browsers | --        | `pnpm exec playwright install chromium`                       |

[Back to top](#table-of-contents)

## Quick Start

```bash
# 1. Install Node dependencies
pnpm install

# 2. Install Playwright browsers (needed for screenshot capture and E2E)
pnpm exec playwright install chromium

# 3. Start Storybook (design source of truth)
pnpm run spec:dev
```

[Back to top](#table-of-contents)

## Pipeline

```text
Design (Storybook) --> Generate PNGs (RPA) --> Validate (E2E Visual Regression)
```

| App                         | Purpose                                           | Tech                                 |
| --------------------------- | ------------------------------------------------- | ------------------------------------ |
| `apps/ui-spec-designer/`    | Visual source of truth -- design all screens here | Storybook 10, React 19, TypeScript 6 |
| `apps/generate-ui-screens/` | Capture golden PNG screenshots from Storybook     | Playwright (RPA mode)                |
| `apps/e2e/`                 | Visual regression against the production app      | Playwright (E2E mode)                |
| `apps/web/`                 | Your production app (placeholder)                 | Replace with your own implementation |

[Back to top](#table-of-contents)

## Running the Pipeline

```bash
# Generate golden PNGs from Storybook
pnpm run pipeline:capture

# Run E2E visual regression
pnpm run e2e:web
```

[Back to top](#table-of-contents)

## Scripts Reference

Root scripts orchestrate workspace packages via `--filter`. Each app owns its own scripts.

| Script              | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `test`              | Full sanity chain: security check + format check + lint + type-check |
| `format:check`      | Check formatting across all apps                                     |
| `lint`              | Lint all apps                                                        |
| `type-check`        | Type-check all apps                                                  |
| `spec:dev`          | Start Storybook dev server (port 6006)                               |
| `spec:build`        | Build static Storybook                                               |
| `artifacts:capture` | Capture golden PNGs from Storybook                                   |
| `e2e:web`           | Run E2E visual regression tests                                      |
| `pipeline:capture`  | Build Storybook + capture golden PNGs                                |
| `clean`             | Remove all build artifacts recursively                               |
| `bumpDependencies`  | Bump dependencies in all apps                                        |
| `release`           | Bump all package.json versions, generate changelog, create git tag   |
| `release:dry-run`   | Preview what `release` would do without making changes               |

[Back to top](#table-of-contents)

## Releasing

The project includes an automated release system powered by
[release-it](https://github.com/release-it/release-it). A single command bumps the version
in all package.json files, generates CHANGELOG.md entries from conventional commits, and
creates a git tag.

```bash
# Preview what would happen (no changes made)
pnpm run release:dry-run

# Run the release
pnpm run release
```

### Branch Conventions

| Branch              | Channel | Version Example |
| ------------------- | ------- | --------------- |
| `main`, `release/*` | stable  | `1.0.0`         |
| `beta`, `next`      | beta    | `2.0.0-beta.1`  |
| `alpha`, `dev`      | alpha   | `3.0.0-alpha.1` |

[Back to top](#table-of-contents)

## Project Structure

```text
my-app/
├── apps/
│   ├── ui-spec-designer/             # Storybook 10 (design source of truth)
│   ├── generate-ui-screens/          # Playwright RPA (golden PNG generation)
│   ├── e2e/                          # Playwright E2E (visual regression)
│   └── web/                          # Your production app (placeholder)
├── shared/
│   └── styles/
│       └── theme.css                 # Tailwind v4 design tokens (@theme)
├── .generated/                       # Unified artifact output (gitignored)
│   ├── snapshots/{project}/{flow}/   # Golden PNGs (RPA capture)
│   └── reports/
│       ├── e2e/                      # E2E Playwright HTML report
│       ├── e2e-diffs/{project}/{flow}/  # Visual regression diffs
│       └── capture/                  # generate-ui-screens Playwright report
├── docs/
│   ├── architecture.md               # Full architecture and ADRs
│   └── feature-validation-pipeline.md  # Pipeline specification
└── package.json                      # Root scripts (workspace orchestration)
```

[Back to top](#table-of-contents)

## Design Tokens

Design tokens live in `shared/styles/theme.css` using Tailwind v4's CSS-first `@theme`
directive. Both Storybook and the production app consume this same file, ensuring identical
colors, typography, spacing, and radii across the visual spec and the production build.

[Back to top](#table-of-contents)

## Documentation

- [Architecture](docs/architecture.md) -- monorepo structure, app responsibilities, and ADR index
- [Feature Validation Pipeline](docs/feature-validation-pipeline.md) -- 3-process pipeline,
  flow-as-story pattern, and coverage validation
- [ADRs](docs/adr/) -- architectural decision records

[Back to top](#table-of-contents)

## Tech Stack

| Technology   | Version | Purpose                                                  |
| ------------ | ------- | -------------------------------------------------------- |
| Storybook    | 10.3.5  | Visual specification and component design                |
| React        | 19.2.5  | UI framework for Storybook components                    |
| TypeScript   | 6.0.2   | Type-safe scripting for Storybook, generators, and tests |
| Tailwind CSS | 4.2.2   | Utility-first CSS with shared design tokens              |
| Playwright   | 1.52.0  | Screenshot generation (RPA) and E2E visual regression    |
| ESLint       | 9+      | Linting (flat config)                                    |
| Prettier     | Latest  | Code formatting                                          |
| pnpm         | 10.33.0 | Package manager and monorepo orchestration               |

[Back to top](#table-of-contents)
