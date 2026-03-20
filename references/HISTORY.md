# Syntheteria — Project History

## Evolution

### Phase 1: React Native Hex-Grid (`pending/`)

The game started as a real-time hex-grid strategy game built with React Native + Expo.
Features: hex tiles, unit movement, basic combat, resource gathering.
This codebase lives in `pending/` as a quarantined reference — never to be resurrected.

### Phase 2: Vite + R3F Sphere World

Pivoted to web-first with Vite. Built a sphere-world model where the entire game
ran on a globe surface with orbit camera. Title globe with storms and cinematic zoom.
ECS migrated from Miniplex to Koota.

POC files: `poc.html`, `poc_real_world.html`

### Phase 3: Phaser + enable3d Isometric Board

Validated that Phaser + enable3d delivers CivRev2-tier visuals with vertex colors
and flat shading. Pivoted the match board to isometric while keeping R3F for the
title globe only. Established the dual-renderer architecture.

POC files: `poc-roboforming.html`, `poc-isometric.html`

### Phase 4: Architecture Cleanup

- Unified `src/views/` with `title/` (R3F) and `board/` (Phaser) subpackages
- Eliminated `src/rendering/` kitchen-sink package — decomposed to proper homes
- Deleted legacy `src/view/` directory
- Established import gates enforcing sim/view boundary
- Config consolidation into `src/config/` with typed registry

### Phase 5: Design Overhaul

Major game design pivot from industrial floor types to biome-based terrain:

- Industrial floor types → biome terrain (grassland, forest, mountain, water, etc.)
- Labyrinth underground → overworld with procedural biome generation
- Cities → hub-and-spoke building networks with per-building management
- Centralized tech tree → building-driven progression (tier upgrades, unlock chains)
- 7 victory conditions → 6 aligned conditions (domination, network, reclamation, transcendence, cult eradication, score)
- Settlement panel → per-building modals (Motor Pool, Synthesizer, etc.)
- 13 salvage materials → 17 natural/processed/synthetic materials
- Radial menu → Civ VI-style contextual action strips

### Phase 6: Platform & CI

- Capacitor SQLite replacing sql.js in production
- Android + iOS platform setup
- GitHub Actions CI: quality gates + Android debug APK workflow
- Balance harness for multi-tier AI-vs-AI diagnostic runs

---

## POC Files (in `references/`)

| File | What it proved |
|------|---------------|
| `poc-roboforming.html` | Vertex colors + flat shading = CivRev2 visuals |
| `poc-isometric.html` | Orthographic isometric camera setup |
| `poc_real_world.html` | Natural terrain with biome-style vertex colors |
| `poc.html` | Ocean grating, metallic mesh rendering |

---

## Reference Games

| Game | Influence |
|------|-----------|
| Civilization Revolution 2 | Primary visual target — isometric tiles, camera, readability |
| Civilization VI (mobile) | Command layout, contextual actions, information architecture |
| Polytopia | Forest canopy blobs, discrete elevation, clean low-poly aesthetic |
| Humankind | Terrain blending between biomes, dramatic elevation |
| Unciv | Complex 4X on phone — proof of concept for mobile 4X |

---

## Key Technology Decisions

| Decision | Rationale |
|----------|-----------|
| Phaser over R3F for board | Game loop + input + scene lifecycle in one framework |
| R3F retained for globe | Signed off title experience, storm effects |
| Koota over Miniplex | Better query API, relations, official React hooks |
| Capacitor over Expo | Web-first + native access without Expo constraints |
| Biome over ESLint | Faster, single-tool lint + format |
| Vitest over Jest | Faster, native ESM, better TS support |
| TypeScript const over JSON | Type safety, autocomplete, co-located with code |
