# ADR-004 -- PROFECO Art. 7 Bis automatic price compliance

> **Docs:** [README](../../README.md) | [AGENTS.md](../../AGENTS.md) | [Architecture](../architecture.md) | [Pipeline](../feature-validation-pipeline.md) | [ADRs](.) | [CLAUDE.md](../../CLAUDE.md) | [Changelog](../../CHANGELOG.md)

## Status

Accepted

## Context

Mexico's Ley Federal de Protección al Consumidor (LFPC), Article 7 Bis, prohibits suppliers from
charging consumers more than the advertised price. Specifically, businesses may not add surcharges
at checkout for the customer's choice of payment method (e.g., a "3% card fee" added on top of the
displayed price). The displayed price must be the final price. PROFECO (Procuraduría Federal del
Consumidor) actively enforces this, and violations carry fines.

Many small businesses in Mexico unknowingly violate this law when they start accepting electronic
payments. They set product prices assuming cash, then attempt to recover payment processing costs
by adding a surcharge at checkout -- a practice that is both illegal and confusing to customers.

Most POS systems in Mexico expose this surcharge mechanism and leave compliance to the merchant.
formo's target users (micro and small businesses) are not lawyers and may not be aware of the
regulation.

## Decision

When a user activates electronic payment methods (available at Tier 2), formo's BOM (Bill of
Materials) pricing engine automatically recalculates product margins to absorb the transaction
cost of each enabled payment method. The public-facing price displayed to customers always
represents the final amount they will pay, with zero surcharge regardless of payment method.

No UI surface in formo allows a merchant to add a surcharge at checkout. The margin absorption
is transparent within the merchant's pricing dashboard (they can see how each payment method
affects their margin per SKU), but the customer-facing price is always single and final.

## Consequences

- formo users are automatically compliant with LFPC Art. 7 Bis -- no legal knowledge required
- Users are protected from PROFECO fines without needing to understand the regulation
- The pricing engine must factor in the transaction cost of each active payment method when
  computing margins (more complex than a flat-margin model)
- Educational UX is required: merchants must understand why their margin changes when enabling
  new payment methods, or they may perceive the app as "changing their prices"
- This is a product differentiator -- most competing POS systems in Mexico do not handle
  this automatically, leaving compliance risk on the merchant
- The constraint is enforceable by design: because surcharge fields do not exist in the UI,
  compliant behavior is the only path available to the user
