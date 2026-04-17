---
name: commit-convention
description: >
  Commit message format for formo.
  Trigger: When creating git commits.
license: Apache-2.0
metadata:
  author: formo
  version: "1.0"
---

## Commit Message Format

```text
type: title

Brief description

- action item 1.
- action item n.
```

### Types

| Type    | When to use                                |
| ------- | ------------------------------------------ |
| `feat`  | New feature or capability                  |
| `task`  | Implementation work on an existing feature |
| `fix`   | Bug fix                                    |
| `chore` | Maintenance, dependencies, config changes  |
| `spike` | Research, investigation, proof of concept  |

### Rules

- **Title**: lowercase, imperative mood, no period (e.g., `feat: add button component`)
- **Brief description**: explains WHY the change was made, not what changed
- **Action items**: list specific changes made, each ending with a period
- **NO** "Co-Authored-By" or AI attribution lines
- **NO** scope in parentheses (no `feat(ui):` — just `feat:`)

### Examples

```text
feat: add button component to visual specification

Visual mold for the primary action button used across the app.

- created Button.tsx with variant and size props.
- added 5 stories covering primary, secondary, destructive, small, large.
- used shared design tokens for colors and spacing.
```

```text
fix: resolve tailwind css import in shared theme

The bare @import "tailwindcss" failed resolution from shared/styles/.

- moved @import "tailwindcss" to each consumer file.
- theme.css now contains only @theme design token directives.
```

```text
spike: investigate ui framework options for storybook

Need to determine the lightest framework for visual mold capture.

- compared React, Angular, and Web Components (Lit).
- evaluated Tailwind v4 css-first shared config viability.
- confirmed zero-js policy is achievable with chosen stack.
```
