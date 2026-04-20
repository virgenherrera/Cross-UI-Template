# Architecture -- Cross UI Template

> **Docs:** [README](../README.md) | [AGENTS.md](../AGENTS.md) | **Architecture** | [Pipeline](feature-validation-pipeline.md) | [ADRs](adr/) | [CLAUDE.md](../CLAUDE.md) | [Changelog](../CHANGELOG.md)

## Table of Contents

- [Overview](#overview)
- [App Pipeline](#app-pipeline)
- [Data Flow](#data-flow)
- [Execution Frequency](#execution-frequency)
- [Flow-as-Story Pattern](#flow-as-story-pattern)
- [Monorepo Structure](#monorepo-structure)
- [Quality Pipeline Sequence](#quality-pipeline-sequence)
- [Architectural Decisions](#architectural-decisions)
- [Technology Stack](#technology-stack)

## Overview

Cross UI Template is a 3-app visual quality pipeline for any production UI.
The core idea: **visual specification (Storybook) serves as the single source of truth for UI
design**. Golden artifacts (PNG screenshots) are generated on-the-fly from those specs, and the
production app is validated against them via E2E visual regression.

The architecture enforces a disciplined pipeline:

1. **P1: Visual Specification** -- design what it should look like (Storybook), with human
   approval across all device x theme variants
2. **P2: Reference Screenshots** -- generate the visual contract on-the-fly (golden artifact
   PNGs to `.generated/snapshots/`)
3. **P3: E2E Visual Regression** -- verify navigation flows, screen transitions, and visual
   accuracy via pixel match threshold against your production app

The shared Tailwind v4 theme ensures the design tool (React/Storybook) and the production app
use identical design tokens -- colors, typography, spacing, and radii.

For the complete pipeline specification including the flow-as-story pattern and coverage
validation, see [Feature Validation Pipeline](feature-validation-pipeline.md).

[Back to top](#table-of-contents)

## App Pipeline

```mermaid
%% Data pipeline: visual specification flows left-to-right through the quality stages
flowchart LR
    VS([UI Spec Designer])
    AG[Generate UI Screens]
    App([Your Production App])
    E2E{E2E Visual Regression}

    VS -->|"stories + components"| AG
    AG -->|"generates PNGs on-the-fly"| E2E
    App -->|"running app"| E2E
    E2E -->|"pass / fail"| Result([Quality Gate])

    subgraph Design Phase
        VS
    end

    subgraph Generation Phase
        AG
    end

    subgraph Production App
        App
    end

    subgraph Validation Phase
        E2E
        Result
    end
```

### App 1 -- UI Spec Designer (Storybook)

- **Purpose**: Independent visual source of truth
- **What it does**: All screens and components are designed here first as React components
  with Storybook stories
- **Produces**: Visual molds (React components + stories)
- **Tech**: Storybook 10.3.5, React 19.2.5, TypeScript 6.0.2, Tailwind CSS v4
- **Location**: `apps/ui-spec-designer/`
- **Package**: `@my-app/ui-spec-designer`

### App 2 -- Generate UI Screens (Playwright RPA)

- **Purpose**: Generate the visual contract as device-agnostic artifacts on-the-fly
- **What it does**: Launches Storybook in headless mode, navigates every story, captures PNG
  screenshots to `.generated/snapshots/` (gitignored)
- **Produces**: Golden artifact PNGs (ephemeral, regenerated before each E2E run)
- **When to run**: Automatically as part of the E2E pipeline -- runs before visual regression tests
- **Tech**: Playwright 1.52.0 (RPA mode), TypeScript
- **Location**: `apps/generate-ui-screens/`
- **Package**: `@my-app/generate-ui-screens`

### App 3 -- E2E Visual Regression (Playwright)

- **Purpose**: Verify navigation flows, screen transitions, and visual accuracy against the
  Storybook golden artifacts
- **What it does**: Runs the screenshot generator first to produce fresh baselines, then connects
  to the production app, executes flow-based integration tests, and validates visual output via
  pixel-diff comparison
- **Test structure**: One test file per flow -- tests are device-agnostic and theme-agnostic.
  The project matrix in `playwright.config.ts` multiplies each test across all variants
- **Baselines**: Reads from `.generated/snapshots/` (produced by generate-ui-screens in the
  same pipeline run)
- **Visual comparison**: Custom runner `run-e2e.ts` using pixelmatch 7.1.0 + pngjs 7.0.0,
  5% diff threshold, 0.1 pixelmatch threshold. Viewport and DPR are matched -- no resize needed
- **Tech**: Playwright 1.52.0 (E2E mode), TypeScript
- **Location**: `apps/e2e/`
- **Package**: `@my-app/e2e`

### App 4 -- Your Production App (placeholder)

- **Purpose**: The production application
- **What it does**: Replace this placeholder with your actual production app
- **Location**: `apps/web/`
- **Package**: `@my-app/web`

[Back to top](#table-of-contents)

## Data Flow

```mermaid
%% Full data flow showing shared theme and artifact paths
flowchart TD
    Theme["shared/styles/theme.css"]
    SB["Storybook (React components)"]
    AG["Generate UI Screens (Playwright RPA)"]
    PNG[".generated/snapshots/ (ephemeral PNGs)"]
    App["Your Production App"]
    E2E["E2E Visual Regression"]

    Theme -->|"design tokens"| SB
    Theme -->|"design tokens"| App
    SB -->|"serves stories"| AG
    AG -->|"generates PNGs on-the-fly"| PNG
    PNG -->|"baseline images"| E2E
    App -->|"running app"| E2E
    E2E -->|"visual regression"| Pass{Pass?}
    Pass -->|"Yes"| Ship([Ship It])
    Pass -->|"No"| Fix["Fix Production App"]
    Fix -->|"iterate"| App
```

[Back to top](#table-of-contents)

## Execution Frequency

Each app runs at a different cadence. Understanding when to run each one prevents wasted
cycles and keeps the pipeline efficient.

| App                  | When to Run             | Trigger                             | Frequency        |
| -------------------- | ----------------------- | ----------------------------------- | ---------------- |
| ui-spec-designer     | During design phase     | Developer starts manually           | On-demand        |
| generate-ui-screens  | As part of E2E pipeline | Runs automatically before E2E tests | Per PR / release |
| e2e                  | Before merge/release    | CI/CD pipeline or on-demand         | Per PR / release |
| web (production app) | During development      | Developer builds/runs locally       | Continuous       |

```mermaid
%% Execution frequency timeline showing when each app runs
flowchart LR
    D([Design Change]) --> SB[Run Storybook]
    SB --> Stable{Design Stable?}
    Stable -->|"No"| SB
    Stable -->|"Yes"| Dev([Develop Production App])
    Dev --> PR{Ready for PR?}
    PR -->|"No"| Dev
    PR -->|"Yes"| Pipeline[E2E Pipeline]
    Pipeline --> AG[Generate PNGs]
    AG --> E2E[Run E2E Visual Regression]
    E2E --> Gate{Tests Pass?}
    Gate -->|"No"| Dev
    Gate -->|"Yes"| Merge([Merge / Release])
```

[Back to top](#table-of-contents)

## Flow-as-Story Pattern

Flows define the navigation sequences a user will experience in your app. They are defined AS
Storybook stories under the `Flows/` title hierarchy, with an explicit step order declared via
`parameters.flow.steps`.

This pattern provides:

- **Type safety**: each flow step renders a real component -- if a component is deleted or
  renamed, TypeScript breaks immediately
- **Automatic discovery**: the RPA and E2E pipelines discover flows via Storybook's `index.json`
- **Human approval**: each flow variant (device x theme) goes through the same approval loop
  as individual screens

For the full flow specification and code examples, see
[Feature Validation Pipeline](feature-validation-pipeline.md#flow-definition).

[Back to top](#table-of-contents)

## Monorepo Structure

```text
my-app/
├── apps/
│   ├── ui-spec-designer/             # Storybook 10 (design source of truth)
│   │   ├── .storybook/
│   │   │   ├── main.ts
│   │   │   └── preview.ts
│   │   └── src/
│   │       └── components/
│   ├── generate-ui-screens/          # Playwright RPA (generate golden PNGs on-the-fly)
│   ├── e2e/                          # Custom Playwright runner (visual regression)
│   └── web/                          # Your production app (placeholder)
├── shared/
│   └── styles/theme.css              # Tailwind v4 design tokens (@theme)
├── .generated/                       # Unified artifact output (gitignored)
│   ├── snapshots/{variant}/{flow}/   # Golden PNGs
│   └── reports/
│       ├── e2e/                      # E2E HTML report
│       ├── e2e-diffs/                # Visual regression diffs
│       ├── capture/                  # RPA capture report
│       └── storybook-static/         # Storybook build
├── docs/
│   ├── architecture.md               # This file
│   └── feature-validation-pipeline.md
└── package.json                      # Root orchestrator
```

[Back to top](#table-of-contents)

## Quality Pipeline Sequence

```mermaid
%% Full quality pipeline from design to validation
sequenceDiagram
    autonumber
    actor Designer
    participant SB as Storybook
    actor Developer
    participant AG as Generate UI Screens
    participant FS as .generated/snapshots/
    participant App as Your Production App
    participant E2E as E2E Visual Regression

    Designer ->> SB: Create/update components and flow stories
    Designer ->> SB: Review ALL variants (device x theme) in browser
    Designer -->> Designer: Iterate until ALL variants approved

    Developer ->> App: Implement components using shared Tailwind theme tokens

    Developer ->> E2E: Run visual regression suite
    Note over AG, E2E: Screenshot generation runs as part of E2E pipeline
    E2E ->> AG: Trigger on-the-fly PNG generation
    AG ->> SB: Launch headless Storybook
    AG ->> SB: Navigate to each story
    SB -->> AG: Rendered story page
    AG ->> FS: Save PNG screenshot
    AG -->> E2E: Generation complete
    E2E ->> App: Connect to running app
    App -->> E2E: Rendered output
    E2E ->> E2E: Navigate flow steps and verify transitions
    E2E ->> E2E: Capture screenshot at each step
    E2E ->> FS: Load golden artifact baseline
    FS -->> E2E: Baseline PNG
    E2E ->> E2E: Visual regression (pixelmatch 5% diff / 0.1 threshold)

    alt All steps pass across all projects
        E2E -->> Developer: Tests PASS
    else Any step or project fails
        E2E -->> Developer: Tests FAIL (diff report)
        Developer ->> App: Fix implementation
    end
```

[Back to top](#table-of-contents)

## Architectural Decisions

All architectural decisions are captured as ADRs:

- [ADR-001](adr/adr-001-framework-agnostic-pixel-perfect-quality-pipeline.md) -- Framework-agnostic
  pixel-perfect quality pipeline

[Back to top](#table-of-contents)

## Technology Stack

```mermaid
%% Technology layers across the monorepo
flowchart TD
    subgraph Design Layer
        SB10["Storybook 10"]
        R19["React 19"]
        TS6["TypeScript 6"]
    end

    subgraph Styling Layer
        TW4["Tailwind CSS v4"]
        Theme["theme.css (@theme tokens)"]
    end

    subgraph Capture Layer
        PWRPA["Playwright (RPA mode)"]
    end

    subgraph Testing Layer
        PWE2E["Playwright (E2E mode)"]
        PM["pixelmatch 7.1.0 + pngjs 7.0.0"]
    end

    subgraph Orchestration Layer
        PNPM["pnpm workspaces"]
        Scripts["Root scripts"]
    end

    SB10 --> TW4
    TW4 --> Theme
    SB10 --> PWRPA
    PWRPA --> PM
    PWE2E --> PM
    PNPM --> SB10
    PNPM --> PWRPA
    PNPM --> PWE2E
```

| Layer          | Technology                                       | Purpose                              |
| -------------- | ------------------------------------------------ | ------------------------------------ |
| Design         | Storybook 10.3.5, React 19.2.5, TypeScript 6.0.2 | Visual specification                |
| Styling        | Tailwind CSS 4.2.2 (CSS-first, shared @theme)   | Design token contract                |
| RPA Capture    | Playwright 1.52.0 (library mode)                | Golden PNG generation                |
| E2E Visual     | Custom runner + pixelmatch 7.1.0 + pngjs 7.0.0  | Visual regression                    |
| Quality        | ESLint 10, Prettier                             | Code quality                         |
| Orchestration  | pnpm 10.33.0 workspaces                         | Monorepo coordination                |

[Back to top](#table-of-contents)
