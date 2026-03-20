# buildings/

Building and cult structure definitions — static data describing what can be built.

## Rules
- **Data only** — no placement logic (that lives in `systems/buildSystem`)
- **BuildingDef keys match `BuildingType` from traits** — keep in sync
- **Cult structures are separate** — they have different properties than player buildings

## Public API
- `BUILDING_DEFS` — `Record<BuildingType, BuildingDef>` with cost, HP, power, etc.
- `BuildingDef` — interface for a building definition
- `CULT_STRUCTURE_DEFS` — cult-specific structure definitions
- `CultStructureDef`, `CultStructureType` — cult structure types

## Files
| File | Purpose |
|------|---------|
| definitions.ts | Player building definitions (cost, HP, effects) |
| cultStructures.ts | EL Cult structure definitions |
