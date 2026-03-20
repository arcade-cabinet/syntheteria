# resources/

Salvage type definitions — static data describing harvestable resources on the map.

## Rules
- **Data only** — no harvesting logic (that lives in `systems/harvestSystem`)
- **`SALVAGE_DEFS` keys match `SalvageType` from traits**
- **Each def includes model IDs** — used by rendering to pick 3D models

## Public API
- `SALVAGE_DEFS` — `Record<SalvageType, SalvageDef>` with yields, rarity, model IDs
- `getAllSalvageModelIds()` — flat list of all salvage model paths
- `getSalvageTypeForModel(modelId)` — reverse lookup from model to type
- `YieldRange`, `SalvageDef` — type interfaces

## Files
| File | Purpose |
|------|---------|
| salvageTypes.ts | Salvage definitions, yields, model mappings |
