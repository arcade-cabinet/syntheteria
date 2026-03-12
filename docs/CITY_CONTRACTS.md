# Spatial Contracts

Canonical contract layer for sector-session state, structural kit packages, and coordination guidance for agents working on TSX surfaces.

## Current Package Changes

### Sector contracts

Canonical world-domain types now live in:

- `src/world/contracts.ts`
- `src/world/snapshots.ts`
- `src/world/poiSession.ts`

Use `src/world/snapshots.ts` for:

- `WorldSessionSnapshot`
- `PersistedWorldSnapshot`
- `CityRuntimeSnapshot`
- `PoiState`
- `NearbyPoiContext`

Do not recreate equivalent view-model types inside UI code unless there is a clear presentational reason.

### Session / persistence alignment

The following now consume the shared snapshot layer:

- `src/world/session.ts`
- `src/world/runtimeState.ts`
- `src/db/worldPersistence.ts`
- `src/ecs/initialization.ts`
- `App.tsx`

If a UI surface needs a sector/session shape, prefer importing the shared snapshot type.

### City config / runtime packages

New pure-TS package layers are now available:

- `src/city/config/cityConfigValidation.ts`
- `src/city/runtime/layoutResolution.ts`
- `src/city/topology.ts`
- `src/city/catalog/cityUnderstanding.ts`
- `src/city/catalog/cityDirectorySemantics.ts`
- `src/city/runtime/cityKitLabState.ts`
- `src/city/composites/compositeSemantics.ts`
- `src/world/locationContext.ts`
- `src/world/citySiteActions.ts`

These own:

- manifest/composite/scenario integrity checks
- deterministic scenario-to-render-space placement math
- shared edge-direction and neighbor topology helpers
- session-level POI discovery and city-link selectors
- snap-class, footprint-class, directory-summary, and composite/scenario summary derivation for the city kit
- explicit directory-level semantic definitions for root, details, and wall families
- City Kit Lab filter/view-model state
- city site action availability and status text
- semantic validation of higher-order composites

If a TSX surface needs to lay out city scenario placements, prefer consuming `resolveCityScenarioPlacements()` from `src/city/runtime/layoutResolution.ts` instead of reimplementing scene math locally.

## Testing Status

These package suites are currently green:

- `src/world/__tests__/cityLifecycle.test.ts`
- `src/world/__tests__/generation.test.ts`
- `src/world/__tests__/poiActions.test.ts`
- `src/world/__tests__/cityTransition.test.ts`
- `src/world/__tests__/poiSystem.test.ts`
- `src/db/__tests__/worldPersistence.test.ts`
- `src/ecs/__tests__/initialization.test.ts`
- `src/city/config/cityConfigValidation.test.ts`
- `src/city/catalog/cityUnderstanding.test.ts`
- `src/city/runtime/cityKitLabState.test.ts`
- `src/city/composites/compositeSemantics.test.ts`
- `src/city/runtime/layoutResolution.test.ts`
- `src/city/__tests__/layoutPlan.test.ts`
- `src/city/catalog/cityCatalog.test.ts`
- `src/city/grammar/cityScenarios.test.ts`
- `src/world/__tests__/citySiteActions.test.ts`
- `src/world/__tests__/locationContext.test.ts`

## Coordination Guidance

- Avoid introducing duplicate session or nearby-site shapes in TSX while these contracts are stabilizing.
- If a UI component needs a new domain field, add it to the shared world/city package contract first and then consume it from TSX.
- If a TSX component currently owns city placement math, flag it here and migrate it to `src/city/runtime/layoutResolution.ts` rather than creating a second resolver.
- `CityKitLab.tsx` should now consume `src/city/runtime/cityKitLabState.ts` for filter options, scenario summaries, and catalog view state.
- `CitySiteModal.tsx` and any site-briefing surfaces should treat `src/world/citySiteActions.ts` and `src/world/locationContext.ts` as the source of truth for interaction logic.
