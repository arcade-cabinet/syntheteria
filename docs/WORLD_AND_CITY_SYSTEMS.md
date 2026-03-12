# World And City Systems

This document describes Syntheteria’s intended spatial model.

## 1. One Continuous Machine-World
Syntheteria is a **single persistent ecumenopolis campaign space**.

It is not, in the intended final design:
- a conventional outdoor wilderness map
- plus a separate city-interior layer

Instead, it is:
- one machine-urban world
- divided into sectors, arcology shells, transit spaces, and breach zones
- rendered and played at different scales without becoming fundamentally different worlds

## 2. Sector Roles
The major campaign locations should be treated as sector archetypes:

- **Command Arcology**
- **Abyssal Extraction Ward**
- **Archive Campus**
- **Cult Wards**
- **Gateway Spine**
- **Breach Zone**

These replace the old mental model of natural overworld geography plus detachable city scenes.

## 3. Operational Density
Cities are no longer a separate mode category. Dense reclaimed machine-urban regions are simply higher-complexity parts of the same world.

That means:
- “city logic” becomes district / sector logic
- operational interiors are still real
- but they are part of the same campaign fabric

## 4. Spatial Contract
The hidden logical contract may still use a square grid or similar placement structure for:
- navigation
- placement
- validation
- sockets
- composites

But the visible representation should be driven by:
- procedural floor and surfaces where helpful
- structural GLB kit pieces
- clear operational readability

Floor tile GLBs are optional. The gameplay contract is more important than one-to-one visible tiles.

Procedural floors should be zone-driven and material-driven:
- core / command sectors can favor sealed concrete or painted service decks
- fabrication / storage / power sectors can favor reinforced plate and industrial metal
- corridors and transit spines can favor walkway / grid surfaces

## 5. Storm Relationship
The storm remains omnipresent, but usually seen through:
- domes
- arcology shells
- breaches
- exposed superstructure
- energy sinks and lightning capture systems

This keeps the hypercane and wormhole visually central without requiring a natural-terrain overworld.

## 6. Infrastructure
Infrastructure should read as embedded in the machine-world:
- energy spines
- relays
- lift shafts
- freight portals
- subsurface or enclosed logistics

Visible belts and exposed network lines may still be used where they improve readability, but they are not the primary long-term identity of the world.

## 7. Progression
The campaign should still preserve:
- fragmented perception
- map merging
- earned strategic clarity
- local unit attachment early
- broader automation later

But that progression should happen within the ecumenopolis, not through a world/city split.

## 8. Current Implementation Rule
Any existing code or docs that still assume:
- outdoor hex-world as the primary target
- separate city interiors as a coequal permanent mode

should be treated as transitional implementation debt, not as the final design direction.

The old terrain tileset ingestion path and generated terrain manifest are no longer part of the product architecture. Structural floors, procedural materials, and classified GLB structures are now the only spatial asset pipeline that should be expanded.

## 9. Naming Rule
Public-facing runtime contracts should now prefer:
- `ecumenopolis`
- `sector`
- `district`
- `substation`
- `anchor`

and avoid exporting:
- `terrain`
- `biome`
- `tile`
- `overworld`
- `city entry`

unless the reference is explicitly historical.
Local context now lives in anchored briefing bubbles and explicit site overlays opened by radial actions. Persistent side panels are no longer the intended owner of site interaction flow.

## 10. Visual Validation Rule
Ecumenopolis generation is not considered validated by type-safe contracts alone.

The implementation must maintain screenshot-backed validation for:
- a deterministic generated campaign overview
- a closer command-arcology anchor-cluster view
- a starting-sector inspection scene
- readable robot placement for the starting chassis roster
- AI-owned robot movement in the live ecumenopolis scene
- readable anchored local-context bubbles
- district overlays, substations, and embedded conduit traces

Those images should come from the same runtime render stack the player sees, not from a separate debugging mockup.
