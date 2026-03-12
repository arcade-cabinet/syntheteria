# World And City Systems

This document describes the current persistence-backed campaign structure that bridges the outdoor 4X world map and future city-instance assembly work.

## 1. Campaign Model

Each save now owns:

- a `save_games` row for immutable campaign setup
- a `world_maps` row for the generated outdoor map header
- `world_tiles` rows for every persisted outdoor hex
- `world_points_of_interest` rows for macro landmarks
- `city_instances` rows for linked interior locations
- `campaign_states` for active scene, active city instance, and tick sync
- `resource_states` for persistent material pools
- `world_entities` for persistent units, buildings, and hybrid world actors

The outdoor world is generated once from `NewGameConfig`, persisted, and then reloaded on `New Game` and `Continue`.

## 2. Outdoor World Responsibilities

The outdoor world map is responsible for:

- biome and terrain-set distribution
- fog/discovery persistence
- POI discovery and interaction range
- strategic movement and expansion framing
- campaign-scale storm/climate identity
- actor placement context for units, buildings, and future owned infrastructure

The current macro POIs are:

- `home_base`
- `coast_mines`
- `science_campus`
- `northern_cult_site`
- `deep_sea_gateway`

POI discovery is now driven by player unit proximity and persisted back to SQLite.

## 2.1 Persistent World Actors

World actors are no longer re-seeded procedurally on load. The save now stores:

- unit identity, faction, type, display name, position, speed, and components
- building identity, type, power/operational state, and position
- lightning-rod specialization state
- navigation state for units
- scene/location linkage for future interior actors

This means `Continue` restores the player's actual world footprint instead of recreating a fresh starter bot and rod on top of a persisted map.

## 3. Scene Transition Contract

The runtime now supports two scene modes:

- `world`
- `city`

Transitions are stored in `campaign_states` and mirrored in runtime state.

Current transition rules:

- entering a surveyed or founded POI-linked city instance switches the active scene to `city`
- returning from a city instance restores `world`
- the active city instance id is persisted so `Continue` can restore the correct scene context

This is the minimum viable contract for real world-to-city transitions. It avoids the Civilization-style city modal and keeps location changes grounded in persistent game state.

## 4. City Instance Foundation

Each city instance currently stores:

- world linkage through POI or coordinates
- a deterministic layout seed
- a `generation_status`
- a `state` (`latent`, `surveyed`, `founded`)

The first implementation keeps city interiors deliberately simple. The runtime renders a square-grid placeholder assembly using a deterministic contract instead of full authored geometry. This gives us:

- a persistence format
- a scene transition target
- a stable place to integrate Quaternius modules later

## 5. Square-Grid Assembly Contract

The current city assembly contract is defined in code:

- `src/city/assemblyContract.ts`
- `src/city/moduleCatalog.ts`
- `src/city/layoutPlan.ts`
- `src/city/layoutValidation.ts`

It specifies:

- fixed square cell size
- grid width and height
- entry cell
- cell module categories
- passability per cell

Current placeholder module families:

- `core`
- `power`
- `fabrication`
- `storage`
- `habitation`
- `corridor`

The city runtime now also includes:

- a deterministic module catalog mapped against the pending Quaternius-style kit
- a layout planner that assigns floor / structure / roof / prop layers per cell
- a validation pass that checks passable connectivity, room access doors, floor coverage, and perimeter sealing

This is intentionally more constrained than the future Quaternius-driven system. The point is to lock the persistence and traversal model first.

## 6. Near-Term Expansion

The next layers to build on top of this structure are:

- founded-city progression
- resource node ownership and depletion
- square-grid city grammar rules
- Quaternius module classification and snapping
- world-to-city return points and local power/signal rules

That work can now happen without redefining saves, world generation, or scene transitions again.

## 7. AI Runtime Ownership

Behavior execution is now owned by `src/ai`, not by ad hoc gameplay systems.

Current AI-owned responsibilities include:

- command-driven player movement as explicit AI tasks
- hostile-machine pursuit and patrol selection
- cultist task planning hooks
- hacking approach / execute phase gating
- persisted per-entity AI task and steering state

Compatibility traits like `Navigation` still exist for rendering and legacy readers, but they are now derived from AI runtime state rather than acting as the primary behavior authoring surface.
