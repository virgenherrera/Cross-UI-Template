# ADR-005 -- Dioxus 0.7 for mobile (Rust + WebView)

> **Docs:** [README](../../README.md) | [AGENTS.md](../../AGENTS.md) | [Architecture](../architecture.md) | [Pipeline](../feature-validation-pipeline.md) | [ADRs](.) | [CLAUDE.md](../../CLAUDE.md) | [Changelog](../../CHANGELOG.md)

## Status

Accepted

## Context

formo needs to run on both Android and iOS from a shared codebase. Four options were evaluated:

| Option | Language | Rendering | Notes |
|---|---|---|---|
| React Native | TypeScript/JS | Native components | Large ecosystem, JS bridge overhead |
| Flutter | Dart | Custom renderer (Skia/Impeller) | Large ecosystem, separate language |
| Native (Kotlin + Swift) | Kotlin / Swift | Native | Best performance, two codebases |
| Dioxus 0.7 | Rust | Platform WebView | Single language, maturing framework |

The team has Rust expertise and the existing tech stack (SQLite via Rusqlite, BOM engine,
financial calculations) is already Rust. A cross-language boundary between a Rust core and a
TypeScript or Dart UI layer would introduce FFI complexity and type-safety gaps.

formo's computation-heavy features (BOM explosion, margin recalculation, PROFECO compliance
engine) benefit from Rust's performance and type system. Writing these in Rust and calling them
from a JS or Dart UI via FFI adds complexity without benefit.

## Decision

Use Dioxus 0.7.5 with the `mobile` feature target for both Android and iOS. The app renders via
the platform's system WebView (Android WebView on Android, WKWebView on iOS). UI styling uses
Tailwind CSS consumed via the same `shared/styles/theme.css` file used by Storybook's visual
molds. All business logic, data access, and payment integrations are implemented in Rust.

This decision yields a single-language stack: Rust for business logic and Dioxus RSX components
for UI, with Tailwind for styling.

## Consequences

- Single language (Rust) across all layers -- no FFI boundary between UI and business logic
- The shared Tailwind theme connects Storybook visual molds to production UI, enabling pixel-
  perfect visual regression validation (see ADR-001)
- Computation-heavy features (BOM, pricing engine) run natively in Rust with no JS bridge
- WebView rendering requires CSS `@layer` support: Android API 33+ (Android 13) and iOS 16+
  are the minimum targets; older devices are excluded
- Dioxus 0.7 is still maturing -- the API surface has had breaking changes between minor
  versions; framework upgrades require dedicated migration effort
- The Dioxus ecosystem is significantly smaller than React Native or Flutter (fewer community
  libraries, less StackOverflow coverage, smaller hiring pool)
- Platform WebView introduces potential rendering inconsistencies between Android and iOS that
  require cross-platform QA on each release
- Hot-reload in development works via the Dioxus CLI (`dx serve`); build times are longer than
  interpreted languages but acceptable given Rust's incremental compilation
