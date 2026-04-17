# ADR-003 -- Freemium with all features compiled in binary

> **Docs:** [README](../../README.md) | [AGENTS.md](../../AGENTS.md) | [Architecture](../architecture.md) | [Pipeline](../feature-validation-pipeline.md) | [ADRs](.) | [CLAUDE.md](../../CLAUDE.md) | [Changelog](../../CHANGELOG.md)

## Status

Accepted

## Context

formo uses a freemium model where Tier 1 is free and Tier 2 (Business) unlocks additional payment
capabilities: SoftPOS (tap-to-pay), CoDi (Mexico's QR payment network), SPEI (bank transfer), and
cryptocurrency payments.

Two implementation strategies were considered:

1. **Plugin / dynamic download**: Ship a minimal binary and download paid feature modules at
   runtime after purchase.
2. **All-in binary with runtime gates**: Ship 100% of all feature code in every binary and activate
   features via local subscription checks.

Apple App Store and Google Play both explicitly prohibit downloading and executing new code after
install (App Store Review Guidelines §2.5.2; Google Play Developer Policy). A plugin architecture
that fetches executable modules post-install risks app rejection or removal. Interpreters and
scripting engines embedded for the app's own use are permitted, but downloading new native logic
is not.

## Decision

Ship 100% of formo's functionality -- including all Tier 2 payment features -- in every binary
release. Feature gates are implemented as runtime checks against locally cached subscription
status. No code is downloaded or sideloaded after installation.

When a user upgrades to Tier 2, the app verifies the subscription (online or via cached receipt),
updates the local gate state, and the features are immediately available -- no additional download
required.

## Consequences

- Full compliance with Apple App Store and Google Play policies -- no risk of rejection on this
  grounds
- Feature activation is instant on purchase (no download step, no wait)
- Binary size is larger because all features are always included
- A single binary covers both tiers, simplifying CI/CD and QA (one artifact to test and ship)
- Feature gate logic must be robust: gates checked server-side on each session start and cached
  locally for offline use; local tampering is a low-value attack (app is not a high-value target)
- All features are integration-tested in every release, regardless of tier -- no "untested paid
  code paths" risk
- When Tier 2 payment integrations change, all users receive the update, even free-tier users who
  don't actively use those features
