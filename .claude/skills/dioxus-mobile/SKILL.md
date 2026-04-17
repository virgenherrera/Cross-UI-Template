---
name: dioxus-mobile
description: >
  Dioxus 0.7 mobile patterns for formo (Android/iOS).
  Trigger: When writing Rust code in apps/mobile or working with Dioxus components.
license: Apache-2.0
metadata:
  author: formo
  version: "1.0"
---

## Eco Script Pattern (MANDATORY)

Every app in the monorepo exposes the SAME script names regardless of runtime.
Root orchestrates via `pnpm --filter` without knowing the underlying tool.

| Script Name    | Node App (ui-spec-designer) | Rust App (mobile)        |
| -------------- | --------------------------- | ------------------------ |
| `lint`         | `eslint src`                | `cargo clippy`           |
| `format`       | `prettier --write`          | `cargo fmt`              |
| `format:check` | `prettier --check`          | `cargo fmt --check`      |
| `type-check`   | `tsc --noEmit`              | `cargo check`            |
| `clean`        | `rimraf <output>`           | `rimraf <output> target` |

Root calls: `pnpm --filter @formo/ui-spec-designer --filter @formo/mobile run <script>`

**NEVER create runtime-specific script names at root** (no `rust:*`, `node:*`, `cargo:*`).

## Dioxus 0.7 Mobile Conventions

### Project Structure

```text
apps/mobile/
├── Cargo.toml        # dioxus 0.7 with mobile + router features
├── Dioxus.toml       # Bundle ID: mx.virgensystems.formo
├── package.json      # Eco scripts (lint, format:check, type-check → cargo)
├── input.css         # Tailwind entry: @import shared theme + @source .rs
├── assets/           # Static assets
└── src/
    └── main.rs       # Entry point: dioxus::launch(app)
```

### Component Pattern

```rust
use dioxus::prelude::*;

#[component]
fn MyComponent(title: String) -> Element {
    rsx! {
        div { class: "flex items-center gap-md bg-surface",
            h1 { class: "text-xl font-bold text-foreground", "{title}" }
        }
    }
}
```

### Rules

- Use shared design token classes from `shared/styles/theme.css` (bg-primary, text-muted, gap-lg, etc.)
- Tailwind scans `.rs` files via `@source "src/**/*.rs"` in `input.css`
- NO web target -- this app is Android/iOS only
- Bundle ID: `mx.virgensystems.formo`
- Use `dx serve --android` / `dx serve --ios` for dev (dx manages simulator/emulator)
- Use `dx build --release --android` / `--ios` for production builds
- Build output goes to `.generated/builds/` (configured via `out_dir` in Dioxus.toml)

### CLI Reference

| Command                        | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `dx serve --android`           | Dev with hot-reload on Android emulator |
| `dx serve --ios`               | Dev with hot-reload on iOS simulator    |
| `dx build --release --android` | Release build for Android               |
| `dx build --release --ios`     | Release build for iOS                   |
| `dx serve --help`              | Discover all available flags            |
