# src/view/ — React Three Fiber Renderer Components

All R3F presentation components. No game logic — only rendering.

## Structure

```
view/
├── renderers/       14 R3F renderer components (terrain, units, buildings, etc.)
├── effects/         3 visual effect components (combat, speech, particles)
├── overlays/        4 overlay components (fog, highlights, paths, territory)
├── globe/           5 title-screen globe components (storms, cities, text, lightning)
├── ModelErrorBoundary.tsx   Shared error boundary for GLB loading
├── UnitStatusBars.tsx       HP/AP bars above units
├── __tests__/       Tests for renderer-exported pure logic
└── index.ts         Public API — all components re-exported
```

## Import Rules

- View components CAN import from `rendering/` (pure TS helpers)
- View components CAN import from `traits/` (for ECS queries)
- `rendering/` MUST NOT import from `view/` (no circular deps)
- External consumers import from `view/` index, not deep paths

## Key Consumer

`src/ui/Globe.tsx` is the primary consumer — it imports all renderers and
composes them inside the single persistent `<Canvas>`.
