# Cross UI Template

> **Docs:** **README** | [AGENTS.md](AGENTS.md) | [Architecture](docs/architecture.md) | [Pipeline](docs/feature-validation-pipeline.md) | [ADRs](docs/adr/) | [CLAUDE.md](CLAUDE.md) | [Changelog](CHANGELOG.md)

## Table of Contents

- [Pipeline](#pipeline)
- [Quick Start](#quick-start)
- [Running the Pipeline](#running-the-pipeline)
- [Scripts Reference](#scripts-reference)
- [Releasing](#releasing)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Design Tokens](#design-tokens)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)

A reusable pnpm monorepo template for pixel-perfect UI quality. Design screens in Storybook,
generate golden PNG screenshots, then prove your production app matches -- regardless of what
framework it uses.

## Pipeline

```text
Design (Storybook) --> Generate PNGs (RPA) --> Validate (E2E Visual Regression)
```

The template ships three pipeline apps plus a placeholder web app:

| App | Purpose | Tech |
|-----|---------|------|
| `apps/ui-spec-designer/` | Visual source of truth -- design all screens here | Storybook 10, React 19, TypeScript 6 |
| `apps/generate-ui-screens/` | Capture golden PNG screenshots from Storybook | Playwright (RPA mode) |
| `apps/e2e/` | Visual regression against your production app | Playwright (E2E mode) |
| `apps/web/` | Placeholder production app (replace with your own) | Any framework |

Your production app plugs into the pipeline at the E2E stage. The template does not prescribe
a production framework -- use Dioxus, Next.js, SvelteKit, Flutter, or anything that renders UI.

[Back to top](#table-of-contents)

## Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url> my-project
cd my-project
pnpm install

# 2. Personalize the template (replaces @cross-ui/ scope and project name)
pnpm run init

# 3. Install Playwright browsers (needed for screenshot capture and E2E)
pnpm exec playwright install chromium

# 4. Start designing
pnpm run spec:dev
```

Storybook opens at `http://localhost:6006`. Design your screens there, then run the pipeline
to validate your production app against the visual specification.

[Back to top](#table-of-contents)

## Running the Pipeline

```bash
# Generate golden PNGs from Storybook stories
pnpm run pipeline:capture

# Run E2E visual regression against your production app
pnpm run pipeline:validate

# Or run both in sequence (recommended)
pnpm run pipeline:full
```

[Back to top](#table-of-contents)

## Scripts Reference

Root scripts orchestrate workspace packages via `--filter`. Each app owns its own scripts.

| Script | Description |
|--------|-------------|
| `init` | Personalize template (replace @cross-ui/ scope and project name) |
| `test` | Full sanity chain: format check + lint + type-check |
| `spec:dev` | Start Storybook dev server (port 6006) |
| `spec:build` | Build static Storybook |
| `app:dev` | Start web app on port 8080 (placeholder -- replace with your framework) |
| `app:build` | Build web app (delegates to @cross-ui/web) |
| `artifacts:capture` | Capture golden PNGs from Storybook |
| `e2e:web` | Run E2E visual regression tests |
| `e2e:web:pw` | Run E2E visual regression via Playwright directly (no wrapper) |
| `pipeline:capture` | Capture golden PNGs |
| `pipeline:validate` | Run E2E visual regression |
| `pipeline:full` | Full pipeline: capture + validate |
| `clean` | Remove all build artifacts recursively |
| `bumpDependencies` | Bump dependencies in all apps (each has its own `.ncurc.json` doctor) |
| `release` | Bump all package.json versions, generate changelog, create git tag |
| `release:dry-run` | Preview what `release` would do without making changes |

[Back to top](#table-of-contents)

## Releasing

The template includes an automated release system powered by
[release-it](https://github.com/release-it/release-it). A single command bumps the version
in all 6 package.json files, generates CHANGELOG.md entries from conventional commits, and
creates a git tag.

```bash
# Preview what would happen (no changes made)
pnpm run release:dry-run

# Run the release
pnpm run release
```

### Branch Conventions

| Branch | Channel | Version Example |
|--------|---------|-----------------|
| `main`, `release/*` | stable | `1.0.0` |
| `beta`, `next` | beta | `2.0.0-beta.1` |
| `alpha`, `dev` | alpha | `3.0.0-alpha.1` |

Even major versions (2, 4, 6) are LTS by convention. The release script warns (but does not
block) when a stable release targets an odd major version.

[Back to top](#table-of-contents)

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >=22.0.0 <25 | [nodejs.org](https://nodejs.org) or `nvm install --lts` |
| pnpm | 10.33.0 | `corepack enable && corepack prepare pnpm@10.33.0 --activate` |
| Playwright browsers | -- | `pnpm exec playwright install chromium` |

[Back to top](#table-of-contents)

## Project Structure

```text
cross-ui-template/
├── apps/
│   ├── ui-spec-designer/             # Storybook 10 (design source of truth)
│   ├── generate-ui-screens/          # Playwright RPA (golden PNG generation)
│   ├── e2e/                          # Playwright E2E (visual regression)
│   └── web/                          # Placeholder production app (replace with your own)
├── shared/
│   └── styles/
│       └── theme.css                 # Tailwind v4 design tokens (@theme)
├── .generated/                       # Unified artifact output (gitignored)
│   ├── snapshots/{project}/{flow}/   # Golden PNGs (RPA capture)
│   └── reports/
│       ├── e2e/                      # E2E Playwright HTML report
│       ├── e2e-diffs/{project}/{flow}/  # Visual regression diffs
│       ├── capture/                  # generate-ui-screens Playwright report
│       └── storybook-static/         # Storybook build output
├── scripts/
│   └── init.sh                       # Template personalization script (bash, self-deleting)
├── docs/
│   ├── architecture.md               # Full architecture and ADRs
│   └── feature-validation-pipeline.md  # Pipeline specification
└── package.json                      # Root scripts (ecos orchestration layer)
```

[Back to top](#table-of-contents)

## Design Tokens

Design tokens live in `shared/styles/theme.css` using Tailwind v4's CSS-first `@theme`
directive. Both Storybook and your production app consume this same file, ensuring identical
colors, typography, spacing, and radii.

[Back to top](#table-of-contents)

## Documentation

- [Architecture](docs/architecture.md) -- monorepo structure, app responsibilities, and ADR index
- [Feature Validation Pipeline](docs/feature-validation-pipeline.md) -- 3-process pipeline,
  flow-as-story pattern, and coverage validation
- [ADRs](docs/adr/) -- architectural decision record (ADR-001)

[Back to top](#table-of-contents)

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Storybook | 10.3.5 | Visual specification and component design |
| React | 19.2.5 | UI framework for Storybook components |
| TypeScript | 6.0.2 | Type-safe scripting for Storybook, generators, and tests |
| Tailwind CSS | 4.2.2 | Utility-first CSS with shared design tokens |
| Playwright | 1.52.0 | Screenshot generation (RPA) and E2E visual regression |
| ESLint | 9+ | Linting (flat config) |
| Prettier | Latest | Code formatting |
| pnpm | 10.33.0 | Package manager and monorepo orchestration |

[Back to top](#table-of-contents)
