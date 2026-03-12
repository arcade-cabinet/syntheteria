# Asset Gaps

This document tracks which art and model categories are already sufficient for implementation and which remain blocked, incomplete, or still need validation against the game design.

## Summary

Current confidence by area:

- **Ecumenopolis structural kit:** strong enough for production use as the primary world language.
- **Sector structural rendering:** procedurally rendered floors plus GLB structural modules are the correct target direction.
- **Player/robot roster:** partially covered.
- **Cultists / human antagonists:** missing.
- **Storm / lightning / wormhole spectacle:** missing as a cohesive runtime-ready set.
- **POI-specific landmark assets:** incomplete.

## 1. Ecumenopolis Structural World

Status: **Sufficient for current implementation**

What we have:

- 91 audited GLBs copied into `assets/models/city`
- 91 rendered previews in `assets/generated/city-previews`
- manifest-backed city model config in `src/config/generated/cityModelManifest.ts`
- an in-app City Kit Lab for family and composite review
- real GLB-backed structural rendering and procedurally renderable floors

Assessment:

- The structural sci-fi kit is no longer just “city interior” support. It is the primary visual language for the reclaimed machine-world.
- The key implementation direction is now procedural floors plus authored structural GLB pieces, not a dependence on visible floor-tile kitbash pieces.
- The current floor-material source should come from curated presets based on `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG`, especially concrete, diamond-plate, walkway, and painted-metal families.
- The remaining work is semantic curation, landmark interpretation, and higher-order sector composition.

Open follow-ups:

- stronger sector landmark composites by gameplay role
- dome / canopy / breach / exterior-shell visual language
- abyssal extraction, archive campus, cult ward, and gateway-specific structures

## 2. Structural Modules (Quaternius / pending-integration/City)

Status: **Operationally sufficient for production-contract work**

What we have:

- 91 audited GLBs copied into `assets/models/city`
- 91 rendered previews in `assets/generated/city-previews`
- manifest-backed city model config in `src/config/generated/cityModelManifest.ts`
- an in-app City Kit Lab for family and composite review
- real GLB-backed city interior rendering

Assessment:

- The kit is no longer a blocker for sector-system implementation.
- The remaining work is semantic curation and higher-order grammar, not import or visibility.
- The branch now has enough coverage to understand walls, doors, roofs, columns, details, props, and stairs as actual runtime pieces.
- Visible floor GLBs should be treated as optional accents. Procedural floor rendering is the cleaner baseline.

Still needed:

- stronger landmark-specific city composites by gameplay role
- continued visual curation of adjacency bias and zone affinity
- POI landmark assets that are outside this indoor modular set

## 3. Robot / Machine Roster

Status: **Partially sufficient, still needs silhouette expansion**

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

- **Field Technician / scout line:** supported
- **Relay hauler line:** supported
- **Fabrication rig line:** supported
- **Assault and defense chassis lines:** now materially supported by the in-repo model set
- **Substation / founding heavy chassis:** partially supported through `MechaGolem` and `MobileStorageBot`
- **Feral / rogue machine variants:** enough to begin enemy differentiation

Open questions:

- whether the current robots visually match the docs' tone of broken industrial machines awakening in a ruined city
- whether fabrication and infrastructure units need additional stationary / semi-stationary silhouettes
- whether dedicated founding / substation-engineering silhouettes need stronger differentiation from combat heavies
- whether cult-controlled machine variants need a more distinct visual language than the current hostile pool

Validated nearby candidate packs on `/Volumes/home/assets`:

- `/Volumes/home/assets/3DLowPoly/Characters/SciFi/Animated Mech Pack - March 2021`
  - strong candidate for additional machine-faction chassis
- `/Volumes/home/assets/3DLowPoly/Characters/SciFi/Animated Robot - Oct 2018`
  - candidate for lighter utility / relay silhouettes
- `/Volumes/home/assets/3DLowPoly/Characters/SciFi/SciFiCharacters-ZuhianTeiyu/CyberSoldier/CyberSoldier.glb`
  - candidate for harsher rival-faction or cult-bound machine enforcement
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Worker_Male.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Worker_Female.glb`
  - useful as baseline human worker silhouettes if we need salvage-camp or neutral-population bodies
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/KayKit_Adventurers_1.0_EXTRA/Engineer.glb`
  - useful as a fallback engineer / technician silhouette if no better industrial human set is found

Recommendation:

- keep the current nine local robot chassis as the gameplay baseline
- search for one clearer stationary fabrication silhouette and one more distinct substation-engineer silhouette before calling the machine roster fully final
- keep any human imports stylistically secondary so machines remain the visual center of the game

## 4. Cultists / Human Enemies

Status: **Partially researched, still missing a validated final set**

Needed:

- baseline wandering cultist model
- war-party / assault variants
- readable silhouettes for lightning-capable humans
- north-faction escalation variants

Why this matters:

- Cultists are a core faction in the docs, not optional flavor.
- The AI substrate now has a real cultist role, but the visual side is still blocked by missing human antagonists.

Priority: **Highest character-art gap**

Current candidate packs worth visual review:

- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Soldier_Male.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Animated Character Pack - Nov 2019/Soldier_Female.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Ultimate Modular Men - Feb 2022/Individual Characters/Casual_Hoodie.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/KayKit_Adventurers_1.0_EXTRA/Rogue_Hooded.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/KayKit_Adventurers_2.0_FREE/Rogue_Hooded.glb`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Animated Men Characters - Feb 2019`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Animated Women Characters - Feb 2019`
- `/Volumes/home/assets/3DLowPoly/Characters/Animated/Posed Background Characters - Aug 2018`
- `/Volumes/home/assets/3DLowPoly/GameKits/Cyberpunk/Cyberpunk Game Kit - July 2022/Enemies`
- `/Volumes/home/assets/3DPSX/Characters/ChibiCharacters/merchant.glb`
- `/Volumes/home/assets/3DPSX/Characters/ChibiCharacters/student.glb`

Assessment:

- the low-poly worker/soldier/hooded human candidates are the most promising for cult conversion
- the PSX characters are useful only as a fallback stylistic branch, not as the preferred mainline cult direction
- none of the currently identified candidates yet read as “storm cult lightning invoker” without additional kitbashing, recolor, or FX support

## 5. Sector Landmark Assets

Status: **Partially research-backed, still incomplete**

Needed by named campaign locations:

- command-arcology landmark pieces
- abyssal extraction / drowned freight / pressure-lock landmarks
- archive campus ruins and observatory-style structures
- cult-ward landmarks and ritual infrastructure
- gateway-spine / ascension-route staging landmarks

Why this matters:

- The world generator now guarantees these macro POIs.
- Without landmark assets, they remain mechanically real but visually under-authored.

Current candidate packs worth integration review:

- `/Volumes/home/assets/3DLowPoly/Assemblages/ModularBuildings/Modular Buildings/building-sample-tower-a.glb`
- `/Volumes/home/assets/3DLowPoly/Assemblages/ModularBuildings/Modular Buildings/building-sample-tower-b.glb`
- `/Volumes/home/assets/3DLowPoly/Assemblages/ModularBuildings/Modular Buildings/building-sample-tower-c.glb`
- `/Volumes/home/assets/3DLowPoly/Assemblages/ModularBuildings/Modular Buildings/building-sample-tower-d.glb`
- `/Volumes/home/assets/3DLowPoly/Vehicles/Cars/Racing Kit/radarEquipment.glb`
- `/Volumes/home/assets/3DLowPoly/Assemblages/SciFiEnv/Ultimate Modular Sci-Fi - Feb 2021/Props_Base.glb`
- `/Volumes/home/assets/3DLowPoly/Environment/Space/Space Station Kit`
- `/Volumes/home/assets/3DLowPoly/Environment/Space/Sci-Fi Essentials Kit - Nov 2024`
- `/Volumes/home/assets/3DLowPoly/Environment/Space/Ultimate Space Kit - March 2023`
- `/Volumes/home/assets/3DLowPoly/Environment/Space/AlienBuildings`
- `/Volumes/home/assets/3DLowPoly/GameKits/SciFi/Modular SciFi MegaKit - Sept 2024`
- `/Volumes/home/assets/3DLowPoly/Environment/City/Building Kit`
- `/Volumes/home/assets/3DLowPoly/Environment/City/City Kit - Commercial`

Assessment:

- the modular tower samples are promising for archive campus, relay spine, and gateway-spine skyline anchors
- `radarEquipment.glb` is promising for relay / archive instrumentation
- `Props_Base.glb` and the space-station/environment kits are promising for command-arcology and transit-node landmark dressing
- we still need a stronger cult-ward landmark language than generic sci-fi infrastructure

## 6. FX / Atmosphere Assets

Status: **Partially implemented, still incomplete**

Needed:

- cult lightning strike effects
- storm-energy arcs / rod capture visuals
- wormhole / sky anomaly visuals
- hacking / signal / compute feedback effects
- ambient weather overlays for the perpetual storm

Why this matters:

- The docs rely heavily on storm identity and lightning as both narrative and mechanical language.
- These effects are as important as character models for making the game read correctly.

What now exists:

- JSON-configured storm/weather tunables in `src/config/weather.json`
- system-owned weather and lightning state in `src/systems/weather.ts` and `src/systems/lightning.ts`
- render-side storm sky / lighting / particles / lightning components under `src/rendering`

What still remains:

- deeper polish and validation of the visual weather stack
- cult-specific lightning effects
- signal / compute / hacking visual language
- route/network overlay composition tied cleanly into weather readability

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

1. cultist / human enemy models with hooded / ritual / lightning-capable silhouettes
2. archive-campus / gateway-spine / cult-ward landmark kits
3. better stationary fabrication and substation-engineer machine silhouettes
4. lightning / storm / wormhole VFX
5. supplementary rival-faction machine silhouettes only after landmark and cult coverage improve

## 9. Current Recommendation

Do not pause implementation waiting for more terrain or generic structural pieces.

Do prioritize:

- cultist models
- sector landmark assets
- validation of whether the current robot roster really matches the game’s lore and design tone

Those are the highest-value asset searches for `pending-integration` next.
