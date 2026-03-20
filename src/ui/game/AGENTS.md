# ui/game/

Game phase UI — HUD, per-building modals, overlays, and panels.

## Rules
- **React DOM** — positioned over the Phaser canvas
- Reads ECS state, dispatches commands to systems
- Per-building modals replace the legacy radial menu

## Key Files
| File | Purpose |
|------|---------|
| HUD.tsx | Resource counters, turn info, AP, end turn button |
| BuildingModal.tsx | Per-building management dispatcher |
| BuildingProgressionOverlay.tsx | Building unlock chain visualization |
| building-panels/*.tsx | Type-specific building panels (8 panels) |
| GarageModal.tsx | Motor Pool fabrication queue |
| GameOutcomeOverlay.tsx | Victory/defeat screen |
| DiplomacyOverlay.tsx | Faction standings |
| TechTreeOverlay.tsx | LEGACY — redirects to BuildingProgressionOverlay |
| Minimap.tsx | Territory visualization minimap |
| TurnLog.tsx | Per-turn event display |
| SelectedInfo.tsx | Unit/building detail panel |
| PauseMenu.tsx | Pause/save/quit |
