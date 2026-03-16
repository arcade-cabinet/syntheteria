# Playwright → Maestro Migration Plan

> **Decision**: Playwright will NOT work for syntheteria (COOP/COEP, expo-sqlite wa-sqlite, Vite bundling). Pivot immediately to Maestro for E2E and RNTL/@react-three/test-renderer for component-level coverage.

## Research Summary (2026)

| Framework | Best For | Setup | Expo Support | Verdict |
|-----------|----------|-------|--------------|---------|
| **Maestro** | E2E (mobile + web) | Zero project deps, CLI only | Official EAS integration | **Primary choice** |
| **Detox** | E2E, gray-box RN | Native config, package install | Community | Heavier setup |
| **RNTL** | Component tests | Jest preset | Standard | For non-3D UI |
| **@react-three/test-renderer** | R3F/WebGL components | Jest | N/A | For 3D scene tests |

**Recommendation**: **Maestro** for all E2E. Simpler than Detox, Expo-native, YAML flows, no codebase impact.

---

## Current Playwright Inventory

### E2E Tests (`tests/e2e/`)

| File | Purpose | Target |
|------|---------|--------|
| `title.spec.ts` | Title screen, new game, settings | Web (localhost:8081) |
| `onboarding.spec.ts` | Full onboarding flow, radial, briefings | Web |
| `ai-playtest-100turns.spec.ts` | 100-turn AI playtest (headed) | Web |

### Component Tests (`tests/components/`)

| Category | Specs | Notes |
|----------|-------|-------|
| UI panels | TitleScreen, NewGameModal, LoadingOverlay, HudButton, BriefingBubble | 2D React Native |
| City/World | EcumenopolisWorld, CityKitLab, CitySiteModal, StructurePlacement | R3F/WebGL |
| Radial/Bots | EcumenopolisRadialBot, EcumenopolisRobotOps | R3F + canvas |
| Misc | TileGridRenderer, ChunkTransition, ModelProbe, Notifications | Mix |

### Visual Tests (`tests/visual/`)

| File | Purpose |
|------|---------|
| `screenshots.spec.ts` | Visual regression |
| `narrative-consistency.spec.ts` | Narrative flow |

---

## Migration Strategy

### Phase 1: Remove Playwright

1. Remove packages: `@playwright/test`, `@playwright/experimental-ct-react`, `playwright`
2. Remove scripts: `test-ct`, `test-visual`
3. Delete: `playwright.config.ts`, `playwright-ct.config.ts`, `playwright/` dir
4. Remove `tests/e2e/`, `tests/components/`, `tests/visual/` (after porting)

### Phase 2: Maestro E2E Setup

1. Install Maestro CLI (standalone, no project deps):
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Create `maestro/` directory:
   ```
   maestro/
   ├── flows/
   │   ├── title.yaml
   │   ├── onboarding.yaml
   │   └── ai-playtest.yaml
   └── config.yaml
   ```

3. EAS integration (optional): Add Maestro Cloud to `eas.json` for CI.

4. **Platform choice**: Current Playwright targets **web**. Maestro supports:
   - **iOS** (simulator) — requires `eas build --profile development --platform ios`
   - **Android** (emulator) — requires `eas build --profile development --platform android`
   - **Web** — Maestro Web SDK (newer, verify docs)

   **Action**: Confirm Maestro Web support for syntheteria's web build. If web is primary, may need to run Maestro against iOS/Android dev builds instead.

### Phase 3: Port E2E Flows to YAML

**title.yaml** (from title.spec.ts):

```yaml
appId: com.arcadecabinet.syntheteria  # or web URL
---
- launchApp
- assertVisible: "SYNTHETERIA"
- assertVisible:
    id: "title-new_game"
- assertVisible:
    id: "title-settings"
- tapOn:
    id: "title-settings"
- assertVisible: "Settings"
- tapOn:
    id: "settings-close"
- assertNotVisible: "Settings"
```

**onboarding.yaml**: Port `clearPersistence` → Maestro launch with fresh state; port tap/assert flows.

**ai-playtest.yaml**: Long-running flow; use Maestro's timeout config. Consider splitting into shorter flows.

### Phase 4: Component Test Strategy

| Component Type | Tool | Rationale |
|----------------|------|------------|
| 2D UI (TitleScreen, NewGameModal, HudButton) | **RNTL** | Standard Jest + RNTL; no WebGL |
| R3F/WebGL (EcumenopolisWorld, CityKitLab) | **@react-three/test-renderer** | Scene-graph assertions without real WebGL |
| Full-screen flows | **Maestro** | E2E covers integration |

**RNTL** (already in devDeps): Port TitleScreen, NewGameModal, LoadingOverlay, BriefingBubble, HudButton.

**@react-three/test-renderer**: Add for R3F components. Use `toGraph()`, `findByType()` for scene assertions. May need `advanceFrames()` for animations.

**Drop or simplify**: Screenshot-based visual tests → Maestro has built-in screenshot/recording. Narrative-consistency → port to Maestro flow or Jest unit test.

### Phase 5: Jest Configuration

- Ensure `@testing-library/react-native` preset for RNTL tests
- Add `@react-three/test-renderer` for R3F tests
- DB: Keep `createTestDb()` + `setDatabaseResolver` in jest.setup.ts (unchanged)

---

## File Mapping

| Playwright | Maestro / Jest |
|------------|----------------|
| `tests/e2e/title.spec.ts` | `maestro/flows/title.yaml` |
| `tests/e2e/onboarding.spec.ts` | `maestro/flows/onboarding.yaml` |
| `tests/e2e/ai-playtest-100turns.spec.ts` | `maestro/flows/ai-playtest.yaml` |
| `tests/components/TitleScreen.spec.tsx` | `src/ui/__tests__/TitleScreen.test.tsx` (RNTL) |
| `tests/components/NewGameModal` (in TitleScreen) | `src/ui/__tests__/NewGameModal.test.tsx` (RNTL) |
| `tests/components/EcumenopolisWorld.spec.tsx` | `src/rendering/__tests__/EcumenopolisWorld.test.tsx` (@react-three/test-renderer) or Maestro flow |
| `tests/visual/*` | Maestro screenshots / Jest snapshots |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Maestro Web support immature | Test early; fall back to iOS/Android dev builds if web fails |
| R3F test-renderer WebGL errors | Use recent @react-three/test-renderer; mock WebGL if needed |
| testID coverage | Audit `testID` on key elements; add where missing for Maestro selectors |
| Clear persistence (localStorage, IndexedDB) | Maestro launch with `--clear-data` or fresh simulator |

---

## Execution Order

1. **Immediate**: Remove Playwright packages and config
2. **Day 1**: Maestro CLI install, create `maestro/flows/`, port title flow
3. **Day 2**: Port onboarding, ai-playtest flows
4. **Day 3**: Add RNTL tests for 2D UI components
5. **Day 4**: Add @react-three/test-renderer for R3F; port or drop 3D component tests
6. **Day 5**: CI wiring (EAS + Maestro Cloud or local simulator)

---

## References

- [Maestro Docs](https://docs.maestro.dev/)
- [Expo + Maestro Cloud](https://expo.dev/blog/expo-now-supports-maestro-cloud-testing-in-your-ci-workflow)
- [@react-three/test-renderer](https://www.npmjs.com/package/@react-three/test-renderer)
- [R3F Testing Guide](https://r3f.docs.pmnd.rs/api/testing)
- [Add Jam: E2E with Maestro](https://addjam.com/blog/2026-02-18/our-experience-adding-e2e-testing-react-native-maestro/)
