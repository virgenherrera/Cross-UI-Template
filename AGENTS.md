# my-app

> **Docs:** [README](README.md) | **AGENTS.md** | [Architecture](docs/architecture.md) | [Pipeline](docs/feature-validation-pipeline.md) | [ADRs](docs/adr/) | [CLAUDE.md](CLAUDE.md) | [Changelog](CHANGELOG.md)

my-app is a Cross-UI-Template — a visual quality pipeline for designing screens in Storybook,
generating golden PNGs, then validating your production app matches pixel-perfect.

## Architecture

| App                 | Path                        | Purpose                                                                   |
| ------------------- | --------------------------- | ------------------------------------------------------------------------- |
| UI Spec Designer    | `apps/ui-spec-designer/`    | Storybook 10 visual source of truth (React 19, TypeScript 6, Tailwind v4) |
| Generate UI Screens | `apps/generate-ui-screens/` | Playwright RPA captures golden PNGs to `.generated/snapshots/`            |
| E2E                 | `apps/e2e/`                 | Playwright visual regression against the production app                   |
| Web (placeholder)   | `apps/web/`                 | Your production app — replace with your own implementation                |

**Flow:** Design (Storybook) -> Generate (RPA -> PNGs) -> Validate (E2E visual regression)

**Shared tokens:** `shared/styles/theme.css` -- Tailwind v4 `@theme` directives only. Each
consumer imports `tailwindcss` before the shared theme.

## Project Structure

```text
my-app/
  apps/
    ui-spec-designer/        # Storybook 10 (design source of truth)
    generate-ui-screens/     # Playwright RPA (golden PNG generation)
    e2e/                     # Playwright E2E (visual regression)
    web/                     # Your production app (placeholder)
  shared/styles/theme.css    # Tailwind v4 design tokens
  .generated/                # Unified artifact output (gitignored)
    snapshots/{project}/{flow}/*.png   # Golden PNGs (RPA capture)
    reports/
      e2e/                   # E2E Playwright HTML report
      e2e-diffs/{project}/{flow}/      # Visual regression diffs
      capture/               # generate-ui-screens Playwright report
  docs/                      # Architecture, pipeline spec, ADRs
```

## Commands

| Script                       | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `pnpm run test`              | Full sanity chain: security check + format, lint, type-check       |
| `pnpm run format:check`      | Check formatting across all apps                                   |
| `pnpm run lint`              | Lint all apps                                                      |
| `pnpm run type-check`        | Type-check all apps                                                |
| `pnpm run spec:dev`          | Storybook dev server (port 6006)                                   |
| `pnpm run spec:build`        | Build static Storybook                                             |
| `pnpm run artifacts:capture` | Capture golden PNGs from Storybook                                 |
| `pnpm run e2e:web`           | E2E visual regression                                              |
| `pnpm run pipeline:capture`  | Build Storybook + capture golden PNGs                              |
| `pnpm run clean`             | Remove all build artifacts recursively                             |
| `pnpm run bumpDependencies`  | Bump deps in all apps                                              |
| `pnpm run release`           | Bump all package.json versions, generate changelog, create git tag |
| `pnpm run release:dry-run`   | Preview what `release` would do without making changes             |

## Local CI Gate

`pnpm run test` MUST pass before ANY commit. No exceptions, no deferral.

## Iron Mandates

1. **Zero-JS Policy**: NO `.js`, `.jsx`, `.cjs` files. Everything MUST be `.ts` or `.tsx`.
   Exceptions: (a) `.json` with `$schema` -- preferred for tool configs. (b) `.mjs` -- only
   when no `.ts` or `.json` support exists. Document WHY in a comment.
2. **100% pnpm**: `npx` is PROHIBITED. Use `pnpm dlx` or local dependencies.
3. **UI Agnosticism**: Storybook components are visual molds. The production app replicates
   them. They are NOT the production app.

## Code Style and Conventions

- Tailwind v4 is CSS-first: `@theme` directives in `shared/styles/theme.css`, NO `tailwind.config.ts`
- Each app has its own CSS entry point that imports `tailwindcss` + shared theme
- Import Storybook types from `@storybook/react-vite` (NOT `@storybook/react`)
- E2E tests use POM (Page Object Model) and AAA (Arrange-Act-Assert)

## Commit Message Format

```text
type: lowercase title in imperative mood

Brief description (explains WHY)

- action item 1.
- action item n.
```

Types: `feat` (new feature), `task` (implementation work), `fix` (bug fix),
`chore` (maintenance), `spike` (research). No AI attribution lines.

## Stack Versions

- Storybook 10.3.5, React 19.2.5, TypeScript 6.0.2
- Tailwind CSS 4.2.2, Playwright 1.52.0
- ESLint 9+ (flat config), Prettier, pnpm 10.33.0

## Skills

AI agent skills live in `.claude/skills/` and provide coding conventions for this project.
Load the relevant skill BEFORE writing code that matches its trigger.

### Commit Convention

Path: `.claude/skills/commit-convention/SKILL.md`

Format: `type: lowercase title` where type is feat|task|chore|spike|fix.
No AI attribution. Brief description explains WHY. Action items list changes.
No scope in parentheses (no `feat(ui):` -- just `feat:`).

### Changelog

Path: `.claude/skills/changelog/SKILL.md`

Keep a Changelog format. Maintain `[Unreleased]` section at top. Group by
Added/Changed/Fixed/Removed. Each entry starts with a past-tense verb.
Map commit types: feat->Added, fix->Fixed, task->Changed, chore->omit if not user-facing.

### Storybook Mold

Path: `.claude/skills/storybook-mold/SKILL.md`

Visual mold components in ui-spec-designer are design specifications, NOT the production app.
They define the visual contract that the production app must replicate pixel-perfectly.
Use `satisfies Meta<typeof Component>`, always add `tags: ["autodocs"]`, import types from
`@storybook/react-vite`, use shared design token classes.

### SDD Guide

Path: `.claude/skills/sdd-guide/SKILL.md`

Reference for when and how to use Spec-Driven Development phases.
SDD is for substantial changes only (features, APIs, architecture). Small fixes = just code.
Flow: init (once) → explore (optional) → propose → spec ∥ design → tasks → apply → verify → archive.
Common mistake: running sdd-init every session (it runs ONCE, the Init Guard handles it).

## Boundaries

| Always                                  | Ask first                          | Never                           |
| --------------------------------------- | ---------------------------------- | ------------------------------- |
| Run `pnpm run test` before committing   | Adding deps to shared packages     | Use `npx` (use `pnpm dlx`)      |
| Use `.ts`/`.tsx` for all source files   | Changing Playwright variant matrix | Write `.js`/`.jsx`/`.cjs` files |
| Use `pnpm` for all package operations   | Modifying shared design tokens     | Commit `.generated/` to git     |
| Load relevant skill before writing code |                                    | Add AI attribution to commits   |
