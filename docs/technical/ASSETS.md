---
title: "Assets"
domain: technical
status: canonical
last_updated: 2026-03-13
summary: "Asset inventory (91 city GLBs, 9 robot chassis), gaps (cultists, landmarks), ingestion pipeline"
depends_on:
  - "ARCHITECTURE.md"
planned_work:
  - "Cultist/human enemy models"
  - "Archive Campus/Gateway Spine landmarks"
  - "Storm/lightning/wormhole VFX coherence"
---

# Assets

## Confidence Summary

| Area | Status |
|---|---|
| Ecumenopolis structural kit | Strong — 91 GLBs, production-ready |
| Sector structural rendering | Procedural floors + GLB modules — correct direction |
| Player/robot roster | Partially covered — 9 chassis |
| Cultists / human antagonists | Missing |
| Storm / lightning / wormhole VFX | Missing as a cohesive set |
| POI-specific landmarks | Incomplete |
| UI / branding | Good enough for current direction |

## City Kit Inventory

**Total: 91 audited GLBs** in `assets/models/city/`

### Family Breakdown

| Family | Count | Use |
|---|---|---|
| `wall` | 20 | Perimeter sealing, room identity via windows/doors |
| `detail` | 26 | Corridor wayfinding, utility accents, wall/roof dressing |
| `prop` | 18 | Gameplay-significant room dressing, storage/fabrication/power flavor |
| `roof` | 12 | Enclosure language, utility-heavy roof treatment |
| `floor` | 7 | Room bases, corridor runs, corner transitions |
| `column` | 4 | Structural anchors, hall framing, tower corners |
| `door` | 2 | Freestanding transition modules, composite-friendly entries |
| `stair` | 1 | Vertical connector, tower stack servicing |
| `utility` | 1 | Connective utility bundle, mechanical accent |

### Sources

- Staging source: `pending-integration/City`
- Runtime source: `assets/models/city/`
- Generated previews: `assets/generated/city-previews/`
- Generated manifest: `src/config/generated/cityModelManifest.ts`

### Composite Families

**Mixed-Use Tower Stack** — floor + columns + windowed walls + single door + roof plate + staircase. Gameplay role: command, habitation, or signal tower shell.

**Service Block** — room floor + double-door wall + solid walls + container/shelf props + pipes roof. Gameplay role: storage or utility room shell.

**Fabrication Hub** — room + corridor floors + computer/teleporter props + utility detail + roof details. Gameplay role: workshop / compute / teleport-support cluster.

### Assessment

The kit is operationally sufficient for deterministic interior assembly, family-by-family visual review, composite experimentation, and branded in-app exploration. The remaining work is semantic curation, landmark interpretation, and higher-order sector composition — not "do we have enough modules."

## Robot / Machine Roster

**Total: 9 chassis** in `assets/models/`

| Model | Gameplay Role |
|---|---|
| `Companion-bot.glb` | Field Technician / scout line |
| `ReconBot.glb` | Field Technician / scout line |
| `MobileStorageBot.glb` | Relay hauler line, partial substation support |
| `Arachnoid.glb` | Fabrication rig line |
| `QuadrupedTank.glb` | Assault and defense |
| `FieldFighter.glb` | Assault and defense |
| `Mecha01.glb` | Assault and defense |
| `MechaTrooper.glb` | Assault and defense |
| `MechaGolem.glb` | Heavy chassis, partial substation/founding support |

### Open Questions

- Whether the current robots visually match the docs' tone of broken industrial machines awakening in a ruined city
- Whether fabrication and infrastructure units need additional stationary/semi-stationary silhouettes
- Whether dedicated founding/substation-engineering silhouettes need stronger differentiation from combat heavies
- Whether cult-controlled machine variants need a more distinct visual language

### Candidate Packs (NAS)

- `/Volumes/home/assets/3DLowPoly/Characters/SciFi/Animated Mech Pack - March 2021` — additional machine-faction chassis
- `/Volumes/home/assets/3DLowPoly/Characters/SciFi/Animated Robot - Oct 2018` — lighter utility/relay silhouettes
- `/Volumes/home/assets/3DLowPoly/Characters/SciFi/SciFiCharacters-ZuhianTeiyu/CyberSoldier/CyberSoldier.glb` — rival-faction enforcement

## Cultists / Human Enemies

**Status: Highest character-art gap**

Needed:
- Baseline wandering cultist model
- War-party / assault variants
- Readable silhouettes for lightning-capable humans
- North-faction escalation variants

Cultists are a core faction in the design — the AI substrate has a real cultist role, but the visual side is blocked by missing human antagonist models.

### Candidate Packs (NAS)

- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/` — Soldier_Male, Soldier_Female, Worker_Male, Worker_Female
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Modular Men - Feb 2022/Individual Characters/Casual_Hoodie.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/KayKit_Adventurers_1.0_EXTRA/Rogue_Hooded.glb`
- `/Volumes/home/assets/3DLowPoly/GameKits/Cyberpunk/Cyberpunk Game Kit - July 2022/Enemies`

Assessment: Low-poly worker/soldier/hooded candidates are the most promising for cult conversion. None yet read as "storm cult lightning invoker" without additional kitbashing, recolor, or FX support.

## Sector Landmark Assets

**Status: Partially researched, incomplete**

Needed by named campaign locations:
- Command-arcology landmark pieces
- Abyssal extraction / drowned freight / pressure-lock landmarks
- Archive campus ruins and observatory-style structures
- Cult-ward landmarks and ritual infrastructure
- Gateway-spine / ascension-route staging landmarks

### Candidate Packs (NAS)

- `/Volumes/home/assets/3DLowPoly/Assemblages/ModularBuildings/Modular Buildings/building-sample-tower-*.glb` — archive campus, relay spine, gateway skyline anchors
- `/Volumes/home/assets/3DLowPoly/Vehicles/Cars/Racing Kit/radarEquipment.glb` — relay/archive instrumentation
- `/Volumes/home/assets/3DLowPoly/Assemblages/SciFi/Ultimate Modular Sci-Fi - Feb 2021/Props_Base.glb` — command-arcology dressing
- `/Volumes/home/assets/3DLowPoly/Environment/Space/Space Station Kit` — transit-node landmarks
- `/Volumes/home/assets/3DLowPoly/GameKits/SciFi/Modular SciFi MegaKit - Sept 2024` — general sci-fi structural

Still needed: a stronger cult-ward landmark language than generic sci-fi infrastructure.

## FX / Atmosphere Assets

**Status: Partially implemented, incomplete**

What exists:
- JSON-configured storm/weather tunables in `src/config/weather.json`
- System-owned weather and lightning state in `src/systems/weather.ts` and `src/systems/lightning.ts`
- Render-side storm sky / lighting / particles / lightning components under `src/rendering/`

What remains:
- Deeper polish and validation of the visual weather stack
- Cult-specific lightning effects
- Signal / compute / hacking visual language
- Route/network overlay composition tied into weather readability

## Ingestion Pipeline

```
pending-integration/City  ──→  assets/models/city/
                                     │
                          scripts/city_inventory_blender.py
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
        assets/generated/    src/config/generated/
        city-previews/       cityModelInventory.json
                                     │
                          scripts/ingest-city-models.ts
                                     │
                                     ▼
                          src/config/generated/
                          cityModelManifest.ts
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
          src/city/catalog   CityKitLab.tsx   CityInteriorRenderer.tsx
```

### Manifest Semantic Fields

The generated manifest emits per model:

| Field | Purpose |
|---|---|
| `family` | Structural category (wall, column, prop, etc.) |
| `subcategory` | Fine-grained type within family |
| `placementType` | How the piece is placed in the grid |
| `footprint` | Grid cells occupied |
| `defaultScale` | Normalized scale for rendering |
| `defaultRotation` | Default orientation |
| `rotationSymmetry` | Symmetry group for placement optimization |
| `pivotPolicy` | Origin point behavior |
| `passabilityEffect` | How it affects navigation pathfinding |
| `zoneAffinity` | Which sector types prefer this piece |
| `adjacencyBias` | Preferred neighbors in grammar rules |
| `compositeEligibility` | Which composite families can include this piece |
| `tags` | Freeform classification tags |

### Regeneration

```bash
pnpm city:ingest
```

This loads every GLB from `assets/models/city/`, renders preview PNGs, emits raw measured inventory JSON, and emits the static-import TypeScript manifest.

## Priority Order

Recommended next asset-search order:

1. Cultist / human enemy models with hooded / ritual / lightning-capable silhouettes
2. Archive-campus / gateway-spine / cult-ward landmark kits
3. Better stationary fabrication and substation-engineer machine silhouettes
4. Lightning / storm / wormhole VFX
5. Supplementary rival-faction machine silhouettes (only after landmark and cult coverage improve)

Do not pause implementation waiting for more terrain or generic structural pieces. The structural kit is sufficient.
