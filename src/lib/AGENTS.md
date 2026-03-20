# lib/

Shared utility functions — small, dependency-free helpers used across packages.

## Rules
- **No domain logic** — pure utility functions only
- **No package dependencies** — lib/ must not import from other src/ packages
- **Keep it small** — if a utility is domain-specific, put it in that domain's package

## Public API
- `randomUUID()` — generate a random UUID string

## Files
| File | Purpose |
|------|---------|
| uuid.ts | UUID generation utility |
