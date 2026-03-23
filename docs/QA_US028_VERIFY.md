# QA: US-028 Verify Mark Upgrade + Hacking Capture

## Summary

Verified US-008 (Mark upgrades) and US-009 (hacking capture) end-to-end.
Found and fixed 5 bugs across 4 files.

## Mark Upgrade Flow (US-008) Verification

### End-to-end path
1. Motor Pool building registered -> `registerMotorPool()`
2. Unit adjacent to powered Motor Pool -> `findAdjacentMotorPools()` (range from `upgrades.json`)
3. Radial menu shows "Upgrade" category -> `radialProviders.ts` mark_upgrade provider
4. `checkUpgradeEligibility()` validates: tier gate, resource cost, XP eligibility
5. `startUpgrade()` deducts resources, creates tick-based `UpgradeJob`
6. `motorPoolUpgradeSystem()` ticks down, applies `entity.set(Unit, { markLevel })` on completion
7. Mark badge renders via `MarkBadge` component in `UnitRenderer.tsx`

### Config sources verified
- `upgrades.json`: Mark costs (scrapMetal, eWaste, intactComponents), tick durations, tier maxMark
- `ResourcePool` type: all resource keys in upgrades.json are valid members
- Tier gates: basic=Mark 2, advanced=Mark 3, elite=Mark 5

### Tests: 27 tests passing (motorPool.test.ts)
- `getMaxMarkForTier` reads from config
- `getUpgradeCost` returns config-driven costs
- `findAdjacentMotorPools` range/power checks
- `checkUpgradeEligibility` tier gate, resource, max mark
- `startUpgrade` resource deduction
- `motorPoolUpgradeSystem` tick completion, power pause, unit destruction

## Hacking Capture Flow (US-009) Verification

### End-to-end path
1. Player unit with Hacking + Signal traits selects hostile
2. Radial "Hack" action in combat category (requires canHack bot profile + AP)
3. `checkHackEligibility()` validates: faction, signal link, compute, not already hacking
4. `initiateHack()` sets Hacking.targetId + progress=0
5. `hackingCaptureSystem()` per-tick: range check, signal check, compute spend, progress
6. On completion: `target.set(Identity, { faction: "player" })`, speech profile assigned
7. Failure modes: signal break resets progress, target out of range resets, target destroyed cancels

### Config sources verified
- `gameplay.json`: hacking.baseDifficulty = 10
- `HACK_RANGE = 3.0` (hackingSystem.ts)
- `CAPTURED_SPEECH_PROFILES`: arachnoid->light_melee, mecha_trooper->ranged, quadruped_tank->siege

### Tests: 35 tests passing (hackingSystem.test.ts)
- Eligibility: faction, signal, compute, already-hacking checks
- Initiation: success/failure paths
- Tick system: progress, completion, signal break, range break, compute stall, speech profile
- Target destruction mid-hack

## Bugs Found and Fixed

### Bug 1: MarkBadge shows component count instead of Mark level
**File:** `src/rendering/UnitRenderer.tsx` line 518-521
**Symptom:** Badge derived markLevel from `renderComponents.length` (hardware component count) instead of `entity.get(Unit)?.markLevel`. After a Mark upgrade, badge would NOT update.
**Fix:** Changed to read `entity.get(Unit)?.markLevel ?? 1`.

### Bug 2: canMotorPoolUpgradeMark uses stale hardcoded config
**File:** `src/systems/motorPool.ts` line 386
**Symptom:** Used `MOTOR_POOL_TIER_CONFIG` (elite.maxMark=3, allows up to Mark 4) instead of `upgrades.json` (elite.maxMark=5). Elite Motor Pools would incorrectly block Mark 5 upgrades via the radial menu path.
**Fix:** Changed to use `getMaxMarkForTier(state.tier)` which reads from `upgrades.json`.

### Bug 3: Radial upgrade handler mutates static trait directly
**File:** `src/systems/radialProviders.ts` line 747
**Symptom:** `unit.markLevel = upgradeCost.toMark` directly mutates a copy returned by `get()`. With Koota static traits, this mutation does not persist.
**Fix:** Changed to `entity.set(Unit, { ...currentUnit, markLevel: upgradeCost.toMark })`.

### Bug 4: applyHackedRole mutates static trait directly
**File:** `src/systems/hacking.ts` line 102
**Symptom:** `unit.speed = unit.speed * role.speedModifier` mutates a copy. Speed modifier from hacked role would not actually apply.
**Fix:** Changed to `entity.set(Unit, { ...unit, speed: unit.speed * role.speedModifier })`.

### Bug 5: hackingSystem() mutates Hacking and Identity traits directly
**File:** `src/systems/hacking.ts` lines 177-237
**Symptom:** Multiple direct mutations on `hack.targetId`, `hack.progress`, `target.get(Identity)!.faction` -- all on copies from `get()`. Hack progress, cancellation, and faction conversion would not persist.
**Fix:** All mutations converted to use `entity.set()` pattern.

## Quality Gates

- TypeScript: `tsc --noEmit` -- zero errors
- Tests: `jest -- motorPool hackingSystem` -- 62 tests passing
- Biome: all lint warnings are pre-existing (unused vars in UnitRenderer, motorPool)
