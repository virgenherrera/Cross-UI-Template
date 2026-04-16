# ADR-001 -- Framework-agnostic pixel-perfect quality pipeline

> **Docs:** [README](../../README.md) | [AGENTS.md](../../AGENTS.md) | [Architecture](../architecture.md) | [Pipeline](../feature-validation-pipeline.md) | [ADRs](.) | [CLAUDE.md](../../CLAUDE.md) | [Changelog](../../CHANGELOG.md)

## Status

Accepted

## Context

Visual quality pipelines that validate production UI against design specifications are valuable
across all UI projects, regardless of production framework. The core challenge: how do you prove
a production app (Dioxus, Next.js, SvelteKit, Flutter -- anything) matches the approved design,
when code-level comparison across frameworks is impossible?

## Decision

Build the template around a 3-app pipeline where PNG screenshots are the framework-agnostic
bridge between design and implementation.

### Separate apps by concern

Each pipeline stage is an independent app with a single responsibility:

- **UI Spec Designer** (Storybook) -- owns DESIGN (what it should look like)
- **Generate UI Screens** (Playwright RPA) -- owns CAPTURE (freezing the visual contract)
- **E2E Visual Regression** (Playwright E2E) -- owns VALIDATION (proving design matches implementation)

This separation means each app evolves, runs, and is tested independently. Artifact generation
only runs when design changes, not on every build.

### PNG artifacts as the bridge

Golden PNG screenshots bridge the gap between design tool and production app. PNGs are generated
on-the-fly to `.generated/snapshots/` (gitignored, never committed). They are technology-agnostic,
human-readable, and objectively diffable via pixel comparison.

### Playwright for both capture and E2E

Using Playwright in two modes (RPA for capture, E2E for assertion) ensures the same browser engine
renders both baselines and comparisons. Single tool to learn, configure, and maintain. Playwright's
`toHaveScreenshot()` API supports visual regression natively.

### Shared Tailwind v4 theme

A single `shared/styles/theme.css` file using Tailwind v4's CSS-first `@theme` directive ensures
identical design tokens (colors, spacing, typography, radii) across Storybook and any production
app. Any framework that supports CSS can consume the tokens.

### Framework-agnostic by design

The template ships with zero framework-specific dependencies beyond Storybook (React). Consumers
bring their own production app and point the E2E suite at it. A placeholder web app demonstrates the
pipeline flow without coupling to a real framework.

## Consequences

- Any UI project can adopt the pipeline regardless of production framework
- Each app has clear ownership boundaries and independent evolution
- PNG artifacts are ephemeral -- no repository bloat, no Git LFS
- Sub-pixel rendering differences may require a diff threshold (acceptable tradeoff)
- Consumers must configure E2E base URLs, viewport matrix, and platform targets themselves
- Slightly more monorepo configuration overhead (acceptable tradeoff for separation of concerns)
