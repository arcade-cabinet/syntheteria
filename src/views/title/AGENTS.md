# views/title/

R3F title + generating globe — React Three Fiber components for title/setup/generating phases.

## Rules
- **TSX components** — React Three Fiber
- Consumed ONLY by `src/ui/Globe.tsx`
- Legacy match renderers (BoardRenderer, UnitRenderer, etc.) are stubs pending deletion

## Files
| File | Purpose |
|------|---------|
| globe/*.tsx | GlobeWithCities, Hypercane, StormClouds, Lightning, TitleText |
| renderers/*.tsx | Legacy R3F renderers (stubs — return null) |
| overlays/*.tsx | Legacy fog/highlight/territory overlays |
| effects/*.tsx | Legacy combat/speech/particle effects |
| glsl/ | GLSL shaders (fog of war sphere) |
| materials/ | Height material |
| ModelErrorBoundary.tsx | Error boundary for GLB loading |
| UnitStatusBars.tsx | HP/AP bars above units |
