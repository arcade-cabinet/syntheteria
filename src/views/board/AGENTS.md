# views/board/

Phaser + enable3d game board — the playing phase renderer. Pure TS, no React.

## Rules
- **No React** — pure Phaser/Three.js code
- **Reads ECS traits** — never mutates game state directly
- Consumed ONLY by `src/app/GameBoard.tsx` (the React bridge)

## Files
| File | Purpose |
|------|---------|
| createGame.ts | Phaser.Game factory |
| eventBus.ts | React ↔ Phaser event emitter |
| scenes/WorldScene.ts | Scene3D — terrain, models, fog, lighting |
| renderers/*.ts | Terrain, units, buildings, fog, particles, etc. |
| lighting/*.ts | World lighting, epoch atmosphere |
| input/boardInput.ts | Pointer → tile input handling |
| labels/domLabels.ts | DOM label projection |
