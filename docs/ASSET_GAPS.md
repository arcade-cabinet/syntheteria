# Asset Gaps

This document tracks which art and model categories are already sufficient for implementation and which remain blocked, incomplete, or still need validation against the game design.

## Summary

Current confidence by area:

- **World map hex terrain:** strong enough for production use in the current outdoor pipeline.
- **City kit / modular interiors:** strong enough to begin real assembly validation, but not yet proven sufficient for full gameplay coverage.
- **Player/robot roster:** partially covered.
- **Cultists / human antagonists:** missing.
- **Storm / lightning / wormhole spectacle:** missing as a cohesive runtime-ready set.
- **POI-specific landmark assets:** incomplete.

## 1. World Map Terrain

Status: **Sufficient for current implementation**

What we have:

- themed biome sheets under `assets/tilesets`
- deterministic biome-to-tileset mapping
- adjacency-aware world generation within and between terrain sets

Assessment:

- The current world-map hex tiles are sufficient for continued world-generation, AI, POI, and campaign work.
- Terrain art quality may still improve later, but it is no longer a blocker.

Open follow-ups:

- validate special transition edges for unusual biome combinations as the world generator gets richer
- add unique POI landmark visuals on top of terrain

## 2. City Modules (Quaternius / pending-integration/City)

Status: **Promising, now under validation**

What we have:

- floor modules
- wall and door variants
- roof variants
- columns / stairs
- props and detail pieces

Assessment:

- The city kit appears sufficient for a first playable interior assembly system.
- The key unresolved question was never just quantity of meshes; it was whether the pieces can be organized into a stable placement grammar. That is now addressed by the city module catalog and validation layer in code.

Still needed:

- actual runtime import/mapping of validated modules into rendered city scenes
- compatibility review for footprint, pivot/origin, and scale consistency across the kit
- classification of which modules are structural vs decorative vs gameplay-significant

## 3. Robot / Machine Roster

Status: **Partial**

Current local models in `assets/models`:

- `Companion-bot.glb`
- `ReconBot.glb`
- `MobileStorageBot.glb`
- `Arachnoid.glb`
- `QuadrupedTank.glb`
- `FieldFighter.glb`
- `Mecha01.glb`
- `MechaTrooper.glb`
- `MechaGolem.glb`

Current gameplay mapping confidence:

- **Maintenance Bot:** acceptable current candidate
- **Utility Drone:** acceptable current candidate
- **Fabrication Unit:** acceptable temporary candidate, but should likely become a more grounded industrial fabrication chassis later
- **Feral / rogue machine variants:** enough to begin enemy differentiation

Open questions:

- whether the current robots visually match the docs' tone of broken industrial machines awakening in a ruined city
- whether fabrication and infrastructure units need more stationary / semi-stationary silhouettes
- whether late-game or cult-controlled machine variants need a separate visual language

## 4. Cultists / Human Enemies

Status: **Missing**

Needed:

- baseline wandering cultist model
- war-party / assault variants
- readable silhouettes for lightning-capable humans
- north-faction escalation variants

Why this matters:

- Cultists are a core faction in the docs, not optional flavor.
- The AI substrate now has a real cultist role, but the visual side is still blocked by missing human antagonists.

Priority: **Highest character-art gap**

## 5. POI Landmark Assets

Status: **Incomplete**

Needed by named campaign locations:

- home-base city landmark pieces
- coast mine extraction / shoreline industry landmarks
- science campus ruins and observatory-style structures
- cult territory landmarks and ritual infrastructure
- deep-sea gateway / launch-route staging landmarks

Why this matters:

- The world generator now guarantees these macro POIs.
- Without landmark assets, they remain mechanically real but visually under-authored.

## 6. FX / Atmosphere Assets

Status: **Missing / under-defined**

Needed:

- cult lightning strike effects
- storm-energy arcs / rod capture visuals
- wormhole / sky anomaly visuals
- hacking / signal / compute feedback effects
- ambient weather overlays for the perpetual storm

Why this matters:

- The docs rely heavily on storm identity and lightning as both narrative and mechanical language.
- These effects are as important as character models for making the game read correctly.

## 7. UI / Branding Assets

Status: **Good enough for current direction**

What we have:

- `assets/ui/background.png`
- transparent title button art in `assets/ui/buttons`

Assessment:

- The immediate title/new-game presentation is in better shape.
- The remaining UI work is more about systemization and in-game panels than raw missing art.

## 8. Priority Order

Recommended next asset-search order:

1. cultist / human enemy models
2. POI landmark kits for science campus / coast mines / cult north
3. better fabrication / infrastructure robot silhouettes if current bots prove too generic
4. lightning / storm / wormhole VFX
5. supplementary city props only after the validated city grammar exposes real holes

## 9. Current Recommendation

Do not pause implementation waiting for more terrain or generic city pieces.

Do prioritize:

- cultist models
- POI landmark assets
- validation of whether the current robot roster really matches the game’s lore and design tone

Those are the highest-value asset searches for `pending-integration` next.
