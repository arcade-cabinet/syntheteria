> **Completed (2026-03-25):** This plan has been fully executed. All 14 tasks are implemented and verified.

# BabylonJS Refactor — Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace R3F/Vite with BabylonJS/Reactylon/Webpack, adopt chunk-based infinite world, implement base system with side panel, responsive RTS HUD, mouse-first input — producing a fully playable RTS.

**Architecture:** Reactylon (Engine+Scene) renders a BabylonJS canvas. `src/board/scene.ts` creates terrain meshes imperatively from chunk data. Robot GLBs load via `ImportMeshAsync`. React DOM + shadcn overlays the canvas for all UI. Koota ECS and game systems are engine-independent and unchanged.

**Tech Stack:** BabylonJS 8 (WebGPU), Reactylon 3, Webpack 5 + babel-plugin-reactylon, Koota ECS, Yuka AI, React 19, shadcn/ui + Tailwind, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-03-25-babylonjs-refactor-design.md`

---

## Task 1: Kill Vite, Promote Webpack

**Files:**
- Delete: `vite.config.ts`
- Delete: `tsconfig.app.json`
- Create: `webpack.config.ts` (from `webpack.poc.config.ts`)
- Modify: `package.json` (scripts, remove vite deps)
- Modify: `tsconfig.json` (merge POC config)
- Create: `src/index.tsx` (new entry point)
- Create: `src/index.css` (fullscreen canvas styles from POC)
- Modify: `index.html` → move to root or `public/` (Webpack HtmlWebpackPlugin template)

- [ ] **Step 1:** Copy `webpack.poc.config.ts` → `webpack.config.ts`. Change entry from `./src/poc/index.tsx` to `./src/index.tsx`. Change HTML template to `index.html`. Add dev/prod mode support. Keep babel-plugin-reactylon, ts-loader, css-loader.

- [ ] **Step 2:** Create `src/index.tsx` — merge POC entry (`src/poc/index.tsx`) with main app entry. Havok physics init + React root mount + Reactylon Engine.

- [ ] **Step 3:** Create `src/index.css` — fullscreen canvas styles from `src/poc/index.css`. Body margin 0, overflow hidden, touch-action none on canvas.

- [ ] **Step 4:** Update `package.json`:
  - Remove: `vite`, `@vitejs/plugin-react`, `vite-static-assets-plugin`
  - Add (if missing): `webpack`, `webpack-cli`, `webpack-dev-server`, `html-webpack-plugin`, `fork-ts-checker-webpack-plugin`, `ts-loader`, `babel-loader`, `style-loader`, `css-loader`, `@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`
  - Scripts: `"dev": "webpack serve --mode=development"`, `"build": "webpack --mode=production"`, remove `dev:poc`

- [ ] **Step 5:** Update `tsconfig.json` — merge `tsconfig.poc.json` settings. Ensure `src/poc/` files compile with main code. Delete `tsconfig.app.json` and `tsconfig.poc.json`.

- [ ] **Step 6:** Delete `vite.config.ts`, `tsconfig.app.json`, `src/static-assets.ts`.

- [ ] **Step 7:** Run `pnpm install && pnpm dev`. Verify dev server starts on port 8080 (or configured port). Verify the page loads (even if blank).

- [ ] **Step 8:** Commit: `"feat: kill Vite, promote Webpack + Reactylon as sole build system"`

---

## Task 2: Install shadcn/ui + Tailwind

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `webpack.config.ts` (add PostCSS loader for Tailwind)
- Modify: `src/index.css` (add Tailwind directives)

- [ ] **Step 1:** Install: `pnpm add tailwindcss @tailwindcss/postcss postcss postcss-loader autoprefixer class-variance-authority clsx tailwind-merge lucide-react`

- [ ] **Step 2:** Create `tailwind.config.ts` — content paths pointing to `src/**/*.{ts,tsx}`. Dark mode class-based. Extend with Syntheteria color palette (slate, cyan, green accent).

- [ ] **Step 3:** Create `postcss.config.js` — `tailwindcss` + `autoprefixer` plugins.

- [ ] **Step 4:** Update `webpack.config.ts` CSS rule — add `postcss-loader` between `css-loader` and `style-loader`.

- [ ] **Step 5:** Update `src/index.css` — add `@tailwind base; @tailwind components; @tailwind utilities;` at top.

- [ ] **Step 6:** Create `src/ui/lib/utils.ts` — the `cn()` helper (clsx + tailwind-merge). This is the shadcn pattern.

- [ ] **Step 7:** Verify: `pnpm dev` — no build errors, Tailwind classes work.

- [ ] **Step 8:** Commit: `"feat: install shadcn/ui + Tailwind CSS"`

---

## Task 3: Delete Old R3F Rendering Layer

**Files:**
- Delete: `src/rendering/` (entire directory: CityRenderer, TerrainRenderer, UnitRenderer, StormSky, LandscapeProps, MoveIndicator)
- Delete: `src/camera/` (entire directory)
- Delete: `src/input/TopDownCamera.tsx`
- Delete: `src/input/UnitInput.tsx`
- Modify: `src/App.tsx` — strip R3F Canvas, imports, and everything that referenced deleted files

- [ ] **Step 1:** Delete directories: `rm -rf src/rendering src/camera`

- [ ] **Step 2:** Delete old input files: `rm src/input/TopDownCamera.tsx src/input/UnitInput.tsx`

- [ ] **Step 3:** Gut `src/App.tsx` — remove ALL R3F imports (`Canvas`, `useFrame`, Three.js, deleted renderers). Keep: React state management, game phases, narration logic, audio lifecycle, persistence init. The 3D canvas will be added back via Reactylon in a later task.

- [ ] **Step 4:** Run `pnpm tsc` — fix all broken imports by removing references to deleted files. The app won't render 3D yet — that's expected.

- [ ] **Step 5:** Run `pnpm test` — some tests may break if they imported renderers. Fix or delete renderer-specific tests (the systems tests should all still pass since they're engine-independent).

- [ ] **Step 6:** Commit: `"chore: delete old R3F rendering layer (replaced by BabylonJS)"`

---

## Task 4: Create Game Canvas (Reactylon Engine+Scene)

**Files:**
- Create: `src/game/GameCanvas.tsx` — Reactylon Engine+Scene, fog, lights
- Create: `src/game/ChunkManager.ts` — load/unload chunks on camera pan
- Modify: `src/App.tsx` — render GameCanvas in playing phase

- [ ] **Step 1:** Create `src/game/GameCanvas.tsx`. Adapt from `src/poc/PocApp.tsx` + `src/poc/CityContent.tsx`:
  - Reactylon `<Engine>` + `<Scene onSceneReady={...}>`
  - `onSceneReady`: fog (mode 2, density 0.015, color #03070b), clearColor matching fog, ground plane at fog color
  - Declarative lights: DirectionalLight (sun), HemisphericLight (ambient), PointLight (accent at player start)
  - ArcRotateCamera setup: beta ~1° (top-down), alpha locked -90°, pan+zoom, zero inertia, radius 20-100

- [ ] **Step 2:** Create `src/game/ChunkManager.ts`. Extract from `CityContent.tsx` `loadChunksAround()`:
  - `initChunks(scene, startCx, startCz, seed)` — loads initial VIEW_RADIUS chunks
  - `updateChunks(scene, cameraCx, cameraCz)` — loads new, unloads distant
  - Uses `generateChunk()`, `populateChunkScene()`, `disposeChunkMeshes()` from `src/board/`
  - Tracks loaded chunks in a Map<ChunkKey, ChunkMeshes>

- [ ] **Step 3:** Wire `ChunkManager` into `GameCanvas` — call `initChunks` on scene ready, hook camera observable to call `updateChunks` on pan.

- [ ] **Step 4:** Modify `src/App.tsx` — in the "playing" phase, render `<GameCanvas />` instead of the old R3F `<Canvas>`. Pass game config (seed, start position) as props.

- [ ] **Step 5:** Run `pnpm dev` — verify the chunk-based labyrinth renders with PBR textures, fog fades edges, camera pans and zooms. Take a screenshot.

- [ ] **Step 6:** Commit: `"feat: BabylonJS game canvas with chunk-based labyrinth rendering"`

---

## Task 5: Entity Rendering (Robot GLBs in BabylonJS)

**Files:**
- Create: `src/game/EntityRenderer.ts` — load GLBs, manage mesh ↔ entity lifecycle
- Modify: `src/config/models.ts` — verify paths work with BabylonJS loader
- Modify: `src/game/GameCanvas.tsx` — initialize EntityRenderer

- [ ] **Step 1:** Create `src/game/EntityRenderer.ts`:
  - `initEntityRenderer(scene)` — loads all 9 GLBs via `LoadAssetContainerAsync` into an asset pool (Map<unitType, AssetContainer>)
  - `syncEntities(world, scene)` — queries Koota world for all entities with `Position` + `Unit`, creates/updates/removes BabylonJS meshes:
    - New entity: `container.instantiateModelsToScene()`, position at world coords via `tileToBabylon()` from `coords.ts`
    - Existing entity: update mesh position (lerp if moving)
    - Removed entity: dispose mesh
  - `getEntityAtPoint(scene, screenX, screenY)` — `scene.pick()` raycast, returns Koota entity ID if hit a robot mesh
  - Selection ring: torus mesh parented to selected entity, cyan emissive
  - Bob animation: BabylonJS `Animation` on Y position

- [ ] **Step 2:** Wire into `GameCanvas.tsx` — call `initEntityRenderer(scene)` on scene ready, call `syncEntities(world, scene)` each frame via `scene.registerBeforeRender()`.

- [ ] **Step 3:** Update `src/ecs/factory.ts` `initializeWorld()` — spawn player units and cult enemies at appropriate chunk positions using the labyrinth room data.

- [ ] **Step 4:** Verify: robots appear on the map at correct positions. Take screenshot.

- [ ] **Step 5:** Commit: `"feat: robot GLBs loaded and positioned from Koota entities"`

---

## Task 6: Mouse-First Input System

**Files:**
- Create: `src/game/InputHandler.ts` — click-to-select, click-to-move, click-to-attack
- Modify: `src/game/GameCanvas.tsx` — wire InputHandler to scene
- Modify: `src/game/EntityRenderer.ts` — add `selectEntity()` / `deselectAll()`

- [ ] **Step 1:** Create `src/game/InputHandler.ts`:
  - `initInput(scene, world)` — registers pointer observers on the BabylonJS scene
  - **Left click on unit** → select (call `selectEntity()`, show selection ring, update sidebar)
  - **Left click on terrain** with unit selected → move command (Yuka pathfind via `Navigation` trait)
  - **Left click on enemy** with unit selected → attack command
  - **Left click on resource** with unit selected → harvest command
  - **Left click on base marker** → open base panel (emit event)
  - **Left click nothing** → deselect
  - **Right click / long press near selected unit** → show radial menu at screen position (emit event)
  - **Left drag** → box selection rectangle (DOM overlay, select all units within)
  - All via `scene.onPointerObservable` — pointer events work identically for mouse and touch

- [ ] **Step 2:** Wire movement: click terrain → compute Yuka path from entity position to click position → set `Navigation` trait → movement system handles the rest.

- [ ] **Step 3:** Verify: click a robot, it highlights. Click terrain, it moves there. Click an enemy, it attacks.

- [ ] **Step 4:** Commit: `"feat: mouse-first input — click to select, move, attack"`

---

## Task 7: Responsive RTS HUD Layout

**Files:**
- Create: `src/ui/layout/GameLayout.tsx` — flex container with sidebar/bottom panel pattern
- Create: `src/ui/layout/TopBar.tsx` — resources, status, speed controls (all clickable buttons)
- Create: `src/ui/layout/Sidebar.tsx` — minimap + selection info + action panel
- Create: `src/ui/layout/Minimap.tsx` — canvas showing chunk outlines + unit dots
- Create: `src/ui/layout/SelectionInfo.tsx` — selected unit details
- Create: `src/ui/layout/ActionPanel.tsx` — context-sensitive action buttons
- Delete: `src/ui/GameUI.tsx` (replaced by the above)
- Modify: `src/App.tsx` — render GameLayout wrapping GameCanvas

Reference: `otter-elite-force/docs/references/poc_final.html` for the responsive pattern.

- [ ] **Step 1:** Create `src/ui/layout/GameLayout.tsx`:
  - `flex flex-col-reverse md:flex-row h-screen w-screen` — mobile bottom, desktop left
  - Sidebar: `w-full md:w-64 h-48 md:h-full flex-shrink-0`
  - Game area: `flex-1 relative overflow-hidden`
  - TopBar: `absolute top-0 w-full h-10 md:h-12 z-20`
  - GameCanvas fills the game area div

- [ ] **Step 2:** Create `TopBar.tsx` — resources (color-coded badges), game status, speed buttons (0.5x/1x/2x/4x + PAUSE — all clickable, no keyboard required), clock/tick.

- [ ] **Step 3:** Create `Sidebar.tsx` — three sections: minimap (top), selection info (middle), action panel (bottom). On mobile these are side-by-side in the bottom panel.

- [ ] **Step 4:** Create `Minimap.tsx` — canvas element. Draws chunk outlines as grid, player units as green dots, cult as red dots, base markers as larger circles, camera viewport as white rectangle.

- [ ] **Step 5:** Create `SelectionInfo.tsx` — selected unit name, component status bars (camera/arms/legs/power_cell), faction badge, mark level. Shows "No Selection" when nothing selected.

- [ ] **Step 6:** Create `ActionPanel.tsx` — context-sensitive buttons based on selection:
  - Unit selected: MOVE, ATTACK, SCAVENGE, FOUND BASE, HACK (if target nearby), STANCE cycle
  - Base selected: opens BasePanel
  - Nothing selected: empty
  - All buttons are clickable — NO keyboard shortcuts required

- [ ] **Step 7:** Delete `src/ui/GameUI.tsx` and `src/ui/game/` directory (old HUD).

- [ ] **Step 8:** Verify: responsive layout works on wide and narrow viewports. All buttons clickable.

- [ ] **Step 9:** Commit: `"feat: responsive RTS HUD — sidebar desktop, bottom mobile, shadcn styled"`

---

## Task 8: Base System

**Files:**
- Modify: `src/ecs/traits.ts` — add `Base` trait
- Create: `src/systems/baseManagement.ts` — founding, production, power, garrison
- Create: `src/ui/base/BasePanel.tsx` — shadcn side panel for base management
- Create: `src/game/BaseMarker.ts` — BabylonJS mesh for base indicators
- Modify: `src/game/EntityRenderer.ts` — render base markers from Koota Base entities
- Modify: `src/ui/layout/ActionPanel.tsx` — add FOUND BASE action
- Modify: `src/board/chunks.ts` or `src/board/zones.ts` — pre-place cult bases in northern zone

- [ ] **Step 1:** Add `Base` trait to `src/ecs/traits.ts`:
  ```typescript
  export const Base = trait({
    name: "",
    tileX: 0,
    tileZ: 0,
    factionId: "player",
    infrastructureJson: "[]", // JSON string array of building type IDs
    productionQueueJson: "[]",
    power: 0,
    storageJson: "{}",
  });
  ```

- [ ] **Step 2:** Create `src/systems/baseManagement.ts`:
  - `foundBase(world, tileX, tileZ, factionId, name)` — validates location (must be passable, room-sized area), spawns Base entity
  - `baseProductionTick(world, deltaSec)` — processes production queues, consumes resources, spawns completed units at base position
  - `basePowerTick(world)` — calculates power from infrastructure lightning rods × storm intensity
  - `getBaseStorage(entity)` / `addToBaseStorage()` / `removeFromBaseStorage()`

- [ ] **Step 3:** Create `src/game/BaseMarker.ts` — creates a BabylonJS mesh (tall thin cylinder with emissive glow, or banner shape) at base world position. Player = cyan, cult = red.

- [ ] **Step 4:** Create `src/ui/base/BasePanel.tsx` — shadcn side panel:
  - Slides from right when base selected
  - Sections: Name, Production Queue, Infrastructure list, Power gauge, Storage grid, Garrison list
  - All interactions are click-based (add to queue, remove from queue, etc.)

- [ ] **Step 5:** Wire: FOUND BASE action in radial/action panel → calls `foundBase()` → creates Base entity → BaseMarker appears on map → clicking marker opens BasePanel.

- [ ] **Step 6:** Pre-place cult bases in northern zone chunks during generation.

- [ ] **Step 7:** Write tests for `baseManagement.ts` — founding validation, production ticks, power calculation.

- [ ] **Step 8:** Commit: `"feat: base system — founding, production, side panel, base markers"`

---

## Task 9: Narration Auto-Advance

**Files:**
- Modify: `src/ui/game/NarrativeOverlay.tsx` — auto-advance with fade transitions

- [ ] **Step 1:** Modify the typewriter effect: after text finishes typing, start a 2.5-second hold timer. When timer expires, fade opacity to 0 over 0.5s, then advance to next frame.

- [ ] **Step 2:** Click/tap during typewriter → complete the text instantly. Click/tap during hold → skip the timer and advance immediately.

- [ ] **Step 3:** Add CSS transition for opacity fade between frames.

- [ ] **Step 4:** SKIP button still bypasses the entire sequence.

- [ ] **Step 5:** Commit: `"feat: narration auto-advances with fade transitions"`

---

## Task 10: Landing Page (BabylonJS Storm Globe)

**Files:**
- Modify: `src/ui/landing/LandingScreen.tsx` — replace R3F globe with BabylonJS ShaderMaterial sphere
- Modify: `src/ui/landing/title/shaders.ts` — port GLSL from Three.js to BabylonJS syntax
- Create: `src/ui/landing/GlobeScene.tsx` — Reactylon Engine+Scene for the landing globe

- [ ] **Step 1:** Port GLSL shaders in `shaders.ts` from Three.js to BabylonJS ShaderMaterial syntax:
  - `attribute` → `in`, `varying` → `in`/`out` in fragment
  - `texture2D()` → `texture()`
  - `gl_FragColor` → explicit out variable
  - Uniform declarations: `uniform mat4 worldViewProjection;` etc.
  - Keep ALL the math identical — FBM clouds, lightning, ecumenopolis, hypercane

- [ ] **Step 2:** Create `src/ui/landing/GlobeScene.tsx` — small Reactylon Engine+Scene that renders:
  - Sphere mesh with the ported storm ShaderMaterial
  - Auto-rotation
  - Dark background
  - Sized to fit behind the landing page DOM overlay

- [ ] **Step 3:** Update `LandingScreen.tsx` — replace R3F `<Canvas>` + `<GlobeBackground>` with the new `<GlobeScene>`. Keep all DOM overlay (title, buttons) unchanged but restyle with shadcn/Tailwind.

- [ ] **Step 4:** Visually compare old vs new landing page. Must be faithful — same storm effect, same globe rotation, same atmosphere.

- [ ] **Step 5:** Commit: `"feat: landing page storm globe ported to BabylonJS ShaderMaterial"`

---

## Task 11: Wire Remaining Game Systems

**Files:**
- Modify: `src/ecs/gameState.ts` — ensure ALL systems tick in the game loop
- Modify: `src/game/GameCanvas.tsx` — call `simulationTick()` in BabylonJS render loop
- Verify: `src/systems/*.ts` all still work (they're engine-independent)

- [ ] **Step 1:** In `GameCanvas.tsx`, register a `scene.registerBeforeRender()` callback that calls `simulationTick()` from `gameState.ts` (scaled by game speed, respecting pause).

- [ ] **Step 2:** Verify all systems are wired in `gameState.ts` `simulationTick()`:
  - `movementSystem`, `combatSystem`, `enemySystem`, `cultEscalationSystem`, `cultAISystem`
  - `resourceSystem`, `fabricationSystem`, `powerSystem`, `repairSystem`
  - `explorationSystem`, `fragmentMergeSystem`
  - `hackingSystem`, `computeSystem`
  - `humanTemperatureSystem`, `gamePhaseSystem`
  - `baseProductionTick`, `basePowerTick` (new)

- [ ] **Step 3:** Verify Yuka NavGraph updates: `navigation.ts` builds per-chunk, movement system reads `Navigation` trait and updates `Position`.

- [ ] **Step 4:** Run all engine-independent tests: `pnpm test`. ALL must pass.

- [ ] **Step 5:** Commit: `"feat: all game systems wired into BabylonJS render loop"`

---

## Task 12: Audio + Persistence Integration

**Files:**
- Modify: `src/App.tsx` — audio lifecycle (init on first click, start on game begin, dispose on unmount)
- Modify: `src/App.tsx` — persistence lifecycle (init web adapter, save/load via base panel or menu)
- Modify: `src/ui/layout/TopBar.tsx` — add clickable SND/MUTE button + volume slider

- [ ] **Step 1:** Wire audio: `initAudio()` on first user interaction (pointer down on canvas or button click). `startAmbience()` + `startMusic(1)` when gameplay starts. `disposeAudio()` on unmount.

- [ ] **Step 2:** Wire persistence: `initPersistence(createWebAdapter())` on app mount. Add SAVE/LOAD clickable buttons in TopBar or a menu modal.

- [ ] **Step 3:** Verify: audio plays, save/load round-trips game state.

- [ ] **Step 4:** Commit: `"feat: audio + persistence wired into BabylonJS app"`

---

## Task 13: Error Handling Sweep

**Files:**
- All `src/**/*.ts` and `src/**/*.tsx`

- [ ] **Step 1:** Search for ALL silent fallback patterns:
  ```bash
  grep -rn "catch.*{}" src/ --include="*.ts" --include="*.tsx"
  grep -rn "catch {$" src/ --include="*.ts" --include="*.tsx"
```text
  Replace every bare `catch` with `catch (e) { logError("module", "description", e); throw e; }` or `catch (e) { logError(...); }` if non-fatal is intentional (with a comment explaining WHY).

- [ ] **Step 2:** Search for `??` fallbacks without safety comments:
  ```bash
  grep -rn "?? \[\]\|?? \"\"\|?? 0" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__
```text
  Add `gameAssert()` before the fallback, or add a comment explaining why the fallback is safe.

- [ ] **Step 3:** Verify ErrorBoundary wraps the app root. Debug overlay toggles with backtick.

- [ ] **Step 4:** Run the game, check console: ZERO errors.

- [ ] **Step 5:** Commit: `"fix: eliminate all silent fallbacks — every error surfaces"`

---

## Task 14: Cleanup + Final Verification

**Files:**
- Delete: `src/poc/` (techniques now in main app)
- Delete: `webpack.poc.config.ts`, `tsconfig.poc.json`, `poc/index.html`
- Delete: `src/ui/game/GameUI.tsx` (if not already deleted)
- Delete: any other dead code from the R3F era

- [ ] **Step 1:** Delete POC files (the code lives in the main app now).

- [ ] **Step 2:** Delete any remaining dead imports, unused files.

- [ ] **Step 3:** Run full verification:
  ```bash
  pnpm tsc          # 0 errors
  pnpm lint         # 0 errors
  pnpm test         # all pass
  pnpm build        # production build succeeds
  ```

- [ ] **Step 4:** Start dev server, playtest:
  - Landing page: storm globe renders faithfully
  - New game → narration auto-advances with fades
  - Gameplay: chunk labyrinth with PBR textures fills viewport
  - Fog fades edges, no visible boundary
  - Robot GLBs visible, positioned correctly
  - Click unit → selects (ring highlight)
  - Click terrain → unit moves (Yuka pathfind)
  - Click enemy → attack
  - Enemies patrol and attack (Yuka GOAP)
  - Responsive HUD: sidebar desktop, bottom mobile
  - All buttons clickable, no keyboard required
  - Found a base → marker appears → click marker → base panel opens
  - Speed controls work (clickable buttons)
  - Audio plays
  - Save/Load round-trips
  - ZERO console errors

- [ ] **Step 5:** Commit: `"chore: cleanup dead code, final verification — BabylonJS refactor complete"`

---

## Success Criteria (from spec)

- [ ] Webpack builds and serves (no Vite)
- [ ] Chunk-based labyrinth with blended PBR textures, fog at edges
- [ ] 9 robot GLBs load and position from Koota entities
- [ ] Robots pathfind across chunks via Yuka NavGraph
- [ ] Cult AI patrols, detects, attacks
- [ ] Component damage combat works
- [ ] Player can found a base, base panel manages production/power/storage
- [ ] Cult bases in northern zone, attackable
- [ ] Landing page storm globe faithful to original
- [ ] Narration auto-advances with fades
- [ ] Responsive HUD: sidebar desktop, bottom mobile
- [ ] Every action is mouse-clickable, no keyboard required
- [ ] Save/load works
- [ ] Audio plays
- [ ] Zero console errors
- [ ] All engine-independent tests pass
- [ ] No silent fallbacks
