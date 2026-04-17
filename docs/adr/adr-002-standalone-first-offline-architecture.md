# ADR-002 -- Standalone-first offline architecture with SQLite

> **Docs:** [README](../../README.md) | [AGENTS.md](../../AGENTS.md) | [Architecture](../architecture.md) | [Pipeline](../feature-validation-pipeline.md) | [ADRs](.) | [CLAUDE.md](../../CLAUDE.md) | [Changelog](../../CHANGELOG.md)

## Status

Accepted

## Context

formo is a Micro-ERP targeting small businesses in Mexico. A significant portion of the target
market operates in areas with unreliable or intermittent internet connectivity -- rural markets,
street vendors, basement workshops, and similar environments where network access is not guaranteed.

Designing around connectivity as a hard requirement would exclude these users or degrade their
experience unpredictably. The app must be fully operational regardless of network state.

Additionally, formo's Tier 1 (free) offering must carry zero cloud infrastructure cost. A
cloud-first architecture would require always-on servers even for free-tier users, making the
economics of a freemium model difficult to sustain.

## Decision

All data lives in SQLite on the device. SQLite is the single source of truth for all business
operations at Tier 1. The UI layer (Dioxus WebView) always reads from and writes to local SQLite
directly -- there is no intermediate API call for core operations.

Network connectivity, when introduced in Tier 2, will be implemented as a background sync process.
Sync never blocks the UI. The app remains fully functional during sync failures or network
unavailability. Cloud storage supplements local SQLite; it does not replace it.

## Consequences

- The app works anywhere, regardless of connectivity -- markets, basements, rural areas
- Tier 1 carries zero server infrastructure cost (the SQLite file lives on the user's device)
- Response times are predictably fast -- all reads and writes are local disk operations
- Sync conflict resolution must be designed carefully when Tier 2 cloud sync is introduced
- Data backup responsibility falls entirely on the user at Tier 1 (no automatic cloud backup)
- SQLite's single-writer model constrains concurrent write scenarios (acceptable for single-user
  mobile app; must be revisited if multi-device sync requires concurrent writers)
- The local database schema must be designed with forward migration compatibility from day one,
  since schema changes must be applied on-device without a server-side migration runner
