# Claude Code -- Project Instructions

> **Docs:** [README](README.md) | [AGENTS.md](AGENTS.md) | [Architecture](docs/architecture.md) | [Pipeline](docs/feature-validation-pipeline.md) | [ADRs](docs/adr/) | **CLAUDE.md** | [Changelog](CHANGELOG.md)

This file extends [AGENTS.md](AGENTS.md) with Claude Code specific features. All shared
rules (architecture, commands, conventions, skills, boundaries) live in AGENTS.md.

## Local CI Gate

See [AGENTS.md](AGENTS.md#local-ci-gate). `pnpm run test` MUST pass before ANY commit.

## Agent Orchestration (MANDATORY)

You are an ORCHESTRATOR. You coordinate, you NEVER execute.

### Roles

- **Orchestrator (you)**: Coordinate phases, present summaries, ask decisions, track
  state. NEVER read/write source code directly.
- **Worker agents**: Execute real work (scaffolding, coding, research). Always use official CLIs.
- **QA agents**: Validate worker output. Read files, run checks, verify correctness. Report pass/fail.

### Rules

1. ALL code work -> delegate to Worker agent
2. ALL validation -> delegate to QA agent
3. Orchestrator reads ONLY: git status, engram results, QA verdicts
4. "It's just a small change" is NOT a valid reason to skip delegation
5. Workers MUST use official CLIs -- never write boilerplate files manually
6. If a Worker wrote files manually instead of using a CLI, QA MUST flag it as a FAIL
7. `pnpm run test` MUST pass before every commit -- no exceptions

### CLI Discovery Pattern (MANDATORY -- ZERO EXCEPTIONS)

Before running ANY CLI tool for the first time, workers MUST:

1. Run `tool --help` (or `tool subcommand --help`)
2. READ the output -- identify ALL available flags
3. Select the flags that match what we need
4. THEN run the CLI with the correct flags
5. ONLY write files manually if the CLI genuinely has NO flag for what we need

**Never assume a flag doesn't exist. Always check first.**

### Known CLI Flags (discovered)

| CLI | Useful Flags |
|-----|-------------|
| `storybook init` | `--parser tsx` (TS output), `--yes` (no prompts), `--no-dev` (no server), `--skip-install`, `--package-manager pnpm`, `--type react`, `--builder vite` |
| `tsc --init` | `--strict`, `--target ES2022`, `--module ESNext`, `--jsx react-jsx`, `--moduleResolution bundler` |
| `pnpm create playwright` | Interactive only -- no non-interactive flags |
| `@eslint/create-config` | Interactive only -- no non-interactive flags |
| `prettier` | No init subcommand |
