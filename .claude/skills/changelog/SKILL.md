---
name: changelog
description: >
  Maintain a CHANGELOG.md following Keep a Changelog format for formo.
  Trigger: When creating commits, releasing versions, or when user asks to update changelog.
license: Apache-2.0
metadata:
  author: formo
  version: "1.0"
---

## Changelog Maintenance

Maintain `CHANGELOG.md` at the project root following the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

### File Location

```text
CHANGELOG.md   # Project root, always
```

### Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New features

### Changed

- Changes to existing functionality

### Deprecated

- Features that will be removed in upcoming releases

### Removed

- Features that were removed

### Fixed

- Bug fixes

### Security

- Vulnerability fixes

## [1.0.0] - 2026-01-15

### Added

- Initial release features
```

### Change Types (in this order)

| Type         | When to use                        |
| ------------ | ---------------------------------- |
| `Added`      | New features or capabilities       |
| `Changed`    | Changes to existing functionality  |
| `Deprecated` | Features marked for future removal |
| `Removed`    | Features that were removed         |
| `Fixed`      | Bug fixes                          |
| `Security`   | Vulnerability patches              |

### Rules

- ALWAYS maintain an `[Unreleased]` section at the top
- Group changes by type using the headings above
- Only include types that have entries (don't leave empty sections)
- Use ISO 8601 date format for releases: `YYYY-MM-DD`
- Each entry is a single bullet point starting with a verb in past tense
- Reference commit hashes or PR numbers when available: `(abc1234)`, `(#42)`
- When releasing, move `[Unreleased]` entries to a new version section
- Keep entries concise but descriptive — explain WHAT changed, not HOW

### When to Update

- **On commit**: Add the change to `[Unreleased]` matching the commit type
- **On release**: Move `[Unreleased]` entries to `[X.Y.Z] - YYYY-MM-DD`
- **On request**: User explicitly asks to update or review the changelog

### Mapping Commit Types to Changelog Sections

| Commit Type | Changelog Section                        |
| ----------- | ---------------------------------------- |
| `feat`      | Added                                    |
| `task`      | Changed (or Added, depending on context) |
| `fix`       | Fixed                                    |
| `chore`     | Changed (only if user-facing) or omit    |
| `spike`     | Omit (not user-facing)                   |

### Release Example

```markdown
## [1.2.0] - 2026-04-16

### Added

- Post-clone init script for template personalization (abc1234)
- Shared Tailwind v4 design tokens for cross-app consistency

### Fixed

- Viewport height mismatch between RPA and E2E screenshots
```
