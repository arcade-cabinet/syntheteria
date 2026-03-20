# input/

Board interaction component — translates pointer events into tile selections and actions.

## Rules
- **Single component** — `BoardInput` handles all pointer interaction on the sphere
- **TSX component** — renders inside the R3F Canvas
- **Translates screen → tile** — converts pointer events to tile coordinates
- **No game logic** — dispatches to systems, never mutates ECS directly

## Public API
- `BoardInput` — R3F component for board pointer interaction

## Files
| File | Purpose |
|------|---------|
| BoardInput.tsx | Pointer event handling on the sphere world |
