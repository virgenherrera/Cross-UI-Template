# Skill Registry -- my-app (2026-04-20)

## Project-Level Skills

| Skill             | Path                                        | Trigger                                                                 |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| commit-convention | `.claude/skills/commit-convention/SKILL.md` | When creating git commits                                               |
| changelog         | `.claude/skills/changelog/SKILL.md`         | When creating commits, releasing versions, or updating changelog        |
| storybook-mold    | `.claude/skills/storybook-mold/SKILL.md`    | When creating React components in ui-spec-designer as visual molds      |
| sdd-guide         | `.claude/skills/sdd-guide/SKILL.md`         | Reference for SDD phase selection and workflow                          |

## User-Level Skills

| Skill              | Path                                           | Trigger                                           |
| ------------------ | ---------------------------------------------- | ------------------------------------------------- |
| react-19           | `~/.claude/skills/react-19/SKILL.md`           | When writing React components                     |
| typescript         | `~/.claude/skills/typescript/SKILL.md`         | When writing TypeScript code                      |
| zustand-5          | `~/.claude/skills/zustand-5/SKILL.md`          | When managing React state with Zustand            |
| zod-4              | `~/.claude/skills/zod-4/SKILL.md`              | When using Zod for validation                     |
| markdownlint       | `~/.claude/skills/markdownlint/SKILL.md`       | When writing or editing .md files                 |
| mermaid            | `~/.claude/skills/mermaid/SKILL.md`            | When producing diagrams in Markdown               |
| go-testing         | `~/.claude/skills/go-testing/SKILL.md`         | When writing Go tests or Bubbletea TUI testing    |
| skill-creator      | `~/.claude/skills/skill-creator/SKILL.md`      | When creating new AI skills                       |
| solution-architect | `~/.claude/skills/solution-architect/SKILL.md` | When writing technical architecture documentation |
| branch-pr          | `~/.claude/skills/branch-pr/SKILL.md`          | When creating pull requests                       |
| issue-creation     | `~/.claude/skills/issue-creation/SKILL.md`     | When creating GitHub issues                       |
| judgment-day       | `~/.claude/skills/judgment-day/SKILL.md`       | Parallel adversarial review protocol              |

## Project Conventions

| File          | Path                                  | Purpose                                                       |
| ------------- | ------------------------------------- | ------------------------------------------------------------- |
| AGENTS.md     | `AGENTS.md`                           | Shared rules: architecture, commands, conventions, boundaries |
| CLAUDE.md     | `CLAUDE.md`                           | Claude Code specific: orchestration, CI gate, CLI discovery   |
| Architecture  | `docs/architecture.md`                | 3-app visual quality pipeline architecture                    |
| Pipeline Spec | `docs/feature-validation-pipeline.md` | Flow-as-story pattern, coverage validation                    |

## Compact Rules

### commit-convention

- Format: `type: lowercase title` (feat, task, fix, chore, spike)
- No AI attribution, no scope in parentheses
- Brief description explains WHY, action items list changes

### changelog

- Keep a Changelog format, maintain `[Unreleased]` at top
- Group by Added/Changed/Fixed/Removed, past-tense verbs
- Map: feat->Added, fix->Fixed, task->Changed, chore->omit if not user-facing

### storybook-mold

- Components are visual molds for the production app, NOT the production app itself
- Import types from `@storybook/react-vite` (pnpm strict isolation)
- Use `satisfies Meta<typeof Component>`, always add `tags: ["autodocs"]`
- Use shared design token classes, all files .tsx

### eco-script-pattern

- Every app exposes the SAME script names (lint, format, format:check, type-check, clean)
- Root orchestrates via `pnpm --filter` without knowing the underlying tool
- NEVER create runtime-specific script names at root (no `rust:*`, `node:*`, `cargo:*`)

### react-19

- React Compiler handles memoization -- no useMemo/useCallback needed
- Use `use()` for promises and context, `useActionState` for forms
- `ref` is a regular prop, `<Context>` replaces `<Context.Provider>`

### typescript

- Strict mode, prefer `interface` over `type` for objects
- Use `satisfies` for type narrowing, `const` assertions for literals
- Discriminated unions over optional fields

### markdownlint

- ATX headings, no trailing spaces, single H1, blank lines around headings/lists
- Fenced code blocks with language, no bare URLs

### Zero-JS Policy (AGENTS.md)

- NO .js/.jsx/.cjs files. Everything .ts/.tsx
- Exceptions: .json with $schema, .mjs only when no TS/JSON support
- npx PROHIBITED, use pnpm dlx

### Orchestrator Pattern (CLAUDE.md)

- Claude is ORCHESTRATOR, never writes code directly
- ALL code work -> Worker agent, ALL validation -> QA agent
- CLI Discovery: always check --help before running any CLI
- Workers MUST use official CLIs, QA flags manual file creation as FAIL
