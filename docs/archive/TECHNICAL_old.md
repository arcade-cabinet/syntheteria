# Syntheteria - Technical Architecture & Core Formulas

## 1. Stack & Rationale
- **Cross-platform framework:** Expo SDK + Metro
- **World & logic:** `koota`
- **Rendering:** React Three Fiber + Three.js + Drei
- **UI & styling:** NativeWind v4 + React Native components
- **Persistence:** Expo SQLite + Drizzle ORM
- **Animation:** `animejs` + `react-native-reanimated`
- **Audio:** Tone.js
- **Testing:** Jest + Playwright component / E2E coverage

## 1.1 Platform Constraints
- Touch-first remains a design constraint.
- The game must remain readable on mobile and desktop.
- Persistent campaign state belongs in SQLite, not long-lived runtime globals.

## 2. Canonical Runtime Shape
Syntheteria’s long-term target is **one continuous sector-based ecumenopolis campaign space**.

This means the architecture should optimize for:
- one persistent campaign world
- sector generation and persistence
- district- and facility-scale traversal inside that same world
- no permanent reliance on a dual model of outdoor hex world plus separate city interior mode

If transitional code still reflects the older split, it should be treated as migration debt, not as the target design.

## 3. ECS Structure
- Koota owns canonical gameplay state.
- Systems own logic.
- TS package layers own rules, contracts, generation, persistence, and AI interfaces.
- TSX reads from those contracts and should not invent gameplay logic locally.

## 4. Sector World Model
The world is one persistent machine-urban environment composed of:
- sectors
- arcology shells
- transit corridors
- breach zones
- exposed infrastructure
- major POI sectors

The old outdoor-biome-plus-city-interior conceptual split is superseded in design.

### Rendering Intent
- Fragmentation still matters.
- Discovery still matters.
- Strategic clarity should be earned.
- Spatial representation should prioritize machine perception and sector readability.

## 5. Persistence
SQLite remains the authoritative long-term state.

Campaign saves should own:
- campaign setup
- sector map / topology state
- POIs and progression
- world actors
- AI state
- infrastructure state
- faction state
- current scene / camera / context where relevant

The save model should support loading the campaign as one coherent machine-world, not as separately generated outdoor and city layers.

## 6. Weather And Storm Runtime
The storm remains a core game system.

Weather systems should own:
- wormhole cycle
- storm intensity
- visibility modifiers
- lightning scheduling
- breach / exposed-sector pressure

Renderers consume system state. They do not invent weather logic.

## 7. Infrastructure
Visible belts and overlay lines are no longer assumed to be the dominant long-term metaphor.

Infrastructure should be modeled as:
- embedded
- subsurface
- structural
- readable where useful, abstract where not

This means:
- explicit above-ground lines should be optional visual aids, not foundational identity
- transit relays, freight portals, lift shafts, and energy spines are preferable long-term metaphors

## 8. World / Sector Traversal
The long-term design target is one campaign space, but it can still support:
- local mode changes
- sector entry / breach states
- denser facility regions
- different camera and interaction emphasis in different parts of the same world

Those should be treated as variations of one world, not as a separate world/city dichotomy.

## 9. AI Runtime Contract
- `src/ai` is the only valid behavior-runtime package.
- Koota owns canonical game state.
- AI runtime owns task execution and steering.
- persistence owns serialized AI state.

Bot definitions should carry:
- archetype
- mark
- speech profile
- default AI role
- steering profile
- navigation profile

Those values should meaningfully affect runtime behavior, not just exist as metadata.

## 10. Architecture Mandates
- No Vite / Vitest
- No Miniplex
- No raw CSS
- No TSX-owned gameplay logic
- No legacy compatibility layers preserved just because they used to exist

## 11. Core Formulas
### Assembly
- `Valid Robot = has_power_source AND has_controller AND (has_locomotion OR is_stationary)`

### Hacking
- `Hack = Signal Link + Required Technique + Available Compute`

### Progression
- Chassis growth should use small archetype sets plus logarithmic Mark progression rather than a sprawling unit tree.
