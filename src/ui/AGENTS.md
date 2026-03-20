# ui/

React components — Globe (the ONE Canvas), landing screens, game HUD, and overlays.

## Rules
- **Globe.tsx is THE Canvas** — one persistent R3F Canvas across all phases
- **Overlay vs diegetic** — DOM overlays (HUD, modals) vs in-Canvas (speech, status bars)
- **No game logic in components** — read state from systems, dispatch actions
- **landing/ and game/ are sub-packages** — organized by phase
- **icons.tsx contains SVG icon components** — used across the UI

## Public API
- `Globe` — the single R3F Canvas component (persistent across all phases)
- `GlobePhase` — phase type: `title | setup | generating | playing`
- `FatalErrorBoundary`, `FatalErrorGate` — error boundary components
- `pushFatalError(err)` — push a fatal error to display

## Sub-packages
- `landing/` — title screen, new game modal, settings
- `game/` — HUD, command UI (legacy `RadialMenu` until replaced), **settlement production** (merge `GarageModal` into city screen), overlays (tech tree, diplomacy, roster, etc.)

## Files
| File | Purpose |
|------|---------|
| Globe.tsx | ONE persistent R3F Canvas — phase state machine |
| FatalErrorModal.tsx | Error boundary + fatal error display |
| icons.tsx | SVG icon components |
| landing/ | Landing screen, NewGameModal, SettingsModal |
| game/ | HUD, command strip / legacy RadialMenu, settlement production (`GarageModal` until merged), overlays |
