---
title: "Best Practices 2026"
domain: technical
status: reference
last_updated: 2026-03-14
summary: "Research-backed software, testing, and stack best practices for 2026 — general and Syntheteria-relevant"
---

# Best Practices 2026

Research-backed summary of current best practices for software development, testing, and the Expo/React Native/Three.js stack. Use as a reference when making architectural or tooling decisions.

---

## 1. Software development (general)

### Principles

- **DRY / YAGNI / KISS** — Eliminate duplication, avoid speculative features, prefer simple designs.
- **SOLID** — Single responsibility, open-closed, Liskov, interface segregation, dependency inversion.
- **Clean code** — Self-documenting names, small focused functions, consistent style; document the “why,” not the “how.”

### Quality & security

- **TDD** — Test-driven development for testable, robust code.
- **Secure SDLC** — Threat modeling (e.g. STRIDE, LINDDUN) from kickoff; treat security as user stories; use static analysis (CodeQL, SonarQube).
- **DevSecOps** — Security integrated in the pipeline, not bolted on afterward.

### Methodology

- **Agile + value stream** — Optimize the full delivery lifecycle; AI-augmented dev for generation, review, optimization.
- **Living documentation** — Docs that evolve with code and are validated by tests.

---

## 2. TypeScript

- **Strict mode** — Use `"strict": true` from day one; treat it as non-negotiable.
- **Extra strict flags** (where feasible):
  - `noUncheckedIndexedAccess` — Index access returns `T | undefined`.
  - `noPropertyAccessFromIndexSignature` — Safer index signatures.
  - `exactOptionalPropertyTypes` — Distinguish optional vs `undefined`.
  - `noFallthroughCasesInSwitch` — Avoid missing `break`.
- **Migration** — Enable incrementally: start with `strictNullChecks`, then `noImplicitAny`, then the rest.
- **Target** — Prefer modern targets (e.g. ES2024) and `NodeNext` module resolution where applicable.

---

## 3. React Native / Expo

### Stack (2025–2026)

- **Expo SDK 55+** — New Architecture only; React Native 0.83, React 19.2.
- **Folder structure** — e.g. `/src/components`, `/src/screens`, `/src/hooks`, `/src/services`, `/src/constants`.
- **Tooling** — Linter + formatter (e.g. Biome per project rules); TypeScript strict.

### Performance

- **React Compiler** — Use where supported for automatic optimizations.
- **Threading** — Keep heavy logic off the JS thread; use worklets (e.g. Reanimated) for animations.
- **Profiling** — Chrome DevTools, Reanimated tooling.

---

## 4. Testing (React Native + Maestro)

### Pyramid

- **~70% unit** — Jest, no simulator; fast, in Node.
- **~20% component** — React Native Testing Library; interactions and conditional UI.
- **~10% E2E** — Maestro on simulators/devices; full user journeys.

### Jest (including Jest 30)

- **Expo** — `npx expo install jest-expo jest @types/jest`.
- **Bare RN** — `jest` + `@react-native/jest-preset` + `@types/jest`.
- **TypeScript** — Use `ts-jest` with `jsx: "react-jsx"` so TSX is transformed correctly.

### React Native Testing Library

- **Queries** — Prefer `getByRole` / `getByLabelText` over `getByTestId`; use `findBy*` for async, `queryBy*` for absence.
- **Interactions** — Prefer `userEvent` over `fireEvent` where available.
- **Scope** — Test behavior and visible UI, not implementation details.
- **Structure** — Arrange–Act–Assert; use `screen` for queries when it keeps tests clearer.
- **Mocks** — Mock `react-native-reanimated` (and other heavy native deps) in component tests to avoid hangs.

### Maestro E2E

- **Targeting** — Prefer `testID` for stability; use visible text when it’s the right semantic match.
- **Structure** — One flow per user journey; reuse via subflows (`runFlow`).
- **Fresh state** — `launchApp: clearState: true` for deterministic runs.
- **Sync** — Rely on Maestro’s synchronization; use `extendedWaitUntil` for long operations.
- **Flakiness** — Maestro’s built-in sync and retries keep flakiness low when selectors are stable.

---

## 5. React Three Fiber (R3F) testing

- **Tool** — `@react-three/test-renderer` for scene-graph tests in Node (no browser/WebGL).
- **Usage** — `ReactThreeTestRenderer.create(<Scene />)`, then `toGraph()`, `findByType()`, etc.
- **Scope** — Assert structure and presence of meshes/materials; use `advanceFrames()` if `useFrame` is involved.
- **Docs** — [R3F Testing](https://r3f.docs.pmnd.rs/api/testing); test-renderer fixes (e.g. primitive children, query behavior) are in recent releases.

---

## 6. Accessibility (WCAG 2.2)

- **Principles (POUR)** — Perceivable, Operable, Understandable, Robust.
- **Focus** — Mobile touch targets, cognitive clarity, keyboard navigation.
- **Implementation** — Semantic HTML/RN components; `role="button"`, `aria-label` on clickables; focus-visible styles; modal semantics (`role="dialog"`, `aria-modal`).
- **Contrast** — Minimum 4.5:1 for text; meaningful focus indicators.
- **Forms** — Label all inputs; clear errors and recovery.

---

## 7. CI/CD (e.g. GitHub Actions)

- **Caching** — Cache deps (Node, etc.) to cut build time significantly.
- **Monorepos** — Only build/test changed packages (e.g. `paths-filter`, Turborepo).
- **Parallelism** — Lint, typecheck, test in parallel; deployment only after success (`needs`).
- **Matrix** — Test multiple OS/runtime versions; use `fail-fast: false` to see all failures.
- **Reuse** — Shared workflows to avoid duplication.
- **Security** — Minimal permissions; pin actions to full SHAs; secrets in secret manager; avoid running untrusted fork code.

---

## 8. Syntheteria-specific alignment

| Area            | Project choice / note                                      |
|-----------------|------------------------------------------------------------|
| Linting/format  | Biome (no ESLint/Prettier)                                |
| Package manager | pnpm                                                       |
| Config over code| Tuning in JSON; one source of truth per domain             |
| Fail-hard assets| Throw on missing assets; no silent fallbacks               |
| E2E             | Maestro (Playwright removed); flows in `maestro/flows/`   |
| Component tests | RNTL in `src/ui/__tests__/`; R3F test-renderer for 3D     |
| TypeScript      | `strict: true` in tsconfig                                |

---

## References (by topic)

- Software: DevSecOps, value stream, secure SDLC (IEEE Computer Society, techlasi, odysse.io).
- TypeScript: Strict mode, noUncheckedIndexedAccess (viadreams, oneuptime, reintech).
- RN testing: React Native Relay testing guide 2026, Maestro docs, BrowserStack Maestro tutorial.
- Expo: SDK 53/55 changelog, New Architecture guide, Expo performance blog.
- RTL: Testing Library cheatsheet, Kent C. Dodd’s RTL mistakes, Ben Ilegbodu best practices.
- R3F: pmnd.rs testing API, @react-three/test-renderer npm, R3F PR #3507.
- A11y: WCAG 2.2 understanding (W3C), WebAIM-style best practices.
- CI/CD: GitHub Actions guides (DevToolbox, monorepo, security).
