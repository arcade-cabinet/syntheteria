# Speech Bubbles — Phaser + R3F Wiring

## Overview

Speech bubbles are fully wired across both rendering stacks:

- **Playing Phase (Phaser):** Sprite-based speech bubbles via `speechRenderer.ts`
- **Title/Setup/Generating (R3F):** HTML-based speech bubbles via `SpeechBubbleRenderer.tsx`

Both consume the same data source (`speechBubbleStore`) with independent renderers.

---

## Data Flow

### 1. Trigger (Game Logic → Store)

Game systems trigger speech by calling functions in `speechTriggers.ts`:

```typescript
// attackSystem.ts
triggerCombatSpeech(world, attacker.id(), faction.factionId);

// harvestSystem.ts
triggerHarvestSpeech(world, unit.id(), faction.factionId);

// memoryFragments.ts
triggerDiscoverySpeech(world, unit.id(), faction.factionId);
```

These resolve the faction's persona → look up speech profile → pick a line → call `triggerSpeech()`.

### 2. Store (Pub/Sub State Management)

`speechBubbleStore.ts` manages speech state:

```typescript
// Core API
triggerSpeech(entityId, factionId, text)  // Trigger with cooldown
getActiveSpeech(): ActiveSpeech[]         // Get non-expired entries
subscribeSpeech(cb): unsubscribe          // React integration (useSyncExternalStore)
clearAllSpeech()                          // Reset on game end
```

**State:**
- `activeSpeech: Map<entityId, ActiveSpeech>` — Active bubbles
- `cooldowns: Map<entityId, number>` — Last spoke timestamp per unit
- `listeners: Set<() => void>` — Subscribers for React reactivity

**Cooldown:** `SPEECH_COOLDOWN_TURNS` (2 turns ≈ 2 seconds)
**Duration:** `SPEECH_BUBBLE_DURATION_TURNS` (3 turns ≈ 3 seconds)

### 3. Renderers

#### Phaser Path (Playing Phase)

**File:** `src/views/renderers/speechRenderer.ts`

Lifecycle:
1. **WorldScene.create()** calls `createSpeechRenderer(scene)` — stores scene ref
2. **WorldScene.update()** calls `updateSpeech(world, delta)` — main loop
3. For each active speech:
   - Create THREE.Sprite with canvas-textured bubble (rounded rect, text)
   - Position above unit: `wp.y + BUBBLE_Y_OFFSET (3.0)`
   - Add to scene
4. For expired speech:
   - Remove sprite from scene
   - Dispose texture and material

**Canvas Rendering:**
- 256×96 canvas with monospace text
- Rounded rectangle background `rgba(10, 15, 25, 0.85)`
- Cyan border `#44aaff`
- Word-wrap to 2 lines max
- Truncate at 40 chars with ellipsis

**Integration:**
```typescript
// WorldScene.ts
createSpeechRenderer(scene);        // Line 123
updateSpeech(world, delta);         // Line 278
```

#### R3F Path (Title/Setup/Generating Phases)

**File:** `src/view/effects/SpeechBubbleRenderer.tsx`

Lifecycle:
1. Mounts when `Globe` component renders (phases: title, setup, generating)
2. Each frame (~150ms interval):
   - Call `getActiveSpeech()` — get active bubbles from store
   - Build unit position lookup from ECS world
   - Render each as Drei `<Html>` with CSS styling
3. Auto-cleanup when bubble expires (via store duration)

**HTML/CSS Rendering:**
- Div with cyan border, dark background
- Monospace font, uppercase text
- Faction color from `FACTION_COLORS[factionId]`
- Fade-out in last 30% of lifetime
- Max 28 characters per line

**Integration:**
```typescript
// Globe.tsx
{world && <SpeechBubbleRenderer world={world} />}  // Line 666
```

---

## Data Structures

### ActiveSpeech (Store)

```typescript
interface ActiveSpeech {
  entityId: number;          // Koota entity ID
  factionId: string;         // "player", "reclaimers", "volt_collective", etc.
  text: string;              // The speech text
  startedAt: number;         // Date.now() timestamp
}
```

---

## Integration Points

### Speech Trigger Sites

| System | Function | Trigger |
|--------|----------|---------|
| `attackSystem.ts` | `triggerCombatSpeech()` | Unit attacks |
| `harvestSystem.ts` | `triggerHarvestSpeech()` | Unit harvests resource |
| `memoryFragments.ts` | `triggerDiscoverySpeech()` | Unit discovers fragment |
| Game events | `triggerEventSpeech()` | Hostile construction, scouts, etc. |

### Rendering Integration

| Phase | Component | Path | Type |
|-------|-----------|------|------|
| title | Globe.tsx | SpeechBubbleRenderer.tsx | R3F Html |
| setup | Globe.tsx | SpeechBubbleRenderer.tsx | R3F Html |
| generating | Globe.tsx | SpeechBubbleRenderer.tsx | R3F Html |
| playing | GameBoard.tsx | speechRenderer.ts | Phaser Sprite |

---

## Key Design Decisions

### Single Data Source

Both renderers read from `speechBubbleStore.getActiveSpeech()`. This means:
- ✅ Consistent timing across rendering paths
- ✅ No data sync issues
- ✅ Cooldown enforced in one place
- ✅ Easy to test (mock the store, test renderers independently)

### Cooldown in Store (Not Renderer)

Cooldown is enforced when triggering, not when rendering. Benefits:
- ✅ Prevents rapid-fire speech from same unit
- ✅ Respects game-time (turns), not real-time
- ✅ Clear API: `triggerSpeech()` either succeeds or silently fails

### No Persistence Across Phases

Speech bubbles clear on phase transition. This is intentional:
- Playing phase loads fresh world state
- Old speech refs would be stale
- `clearAllSpeech()` called on game end/reset

---

## Troubleshooting

### Bubbles Not Appearing in Playing Phase

1. Check WorldScene calls `createSpeechRenderer()` in `create()`
2. Check WorldScene calls `updateSpeech()` in `update()` loop
3. Verify game systems call `triggerCombatSpeech()`, etc.
4. Check store has active entries: `console.log(getActiveSpeech())`
5. Check sprite scene ref: `sceneRef` is not null in speechRenderer

### Bubbles Not Appearing in Title Phase

1. Check `<SpeechBubbleRenderer world={world} />` is mounted in Globe.tsx
2. Check world is passed down as prop
3. Verify store has entries: `console.log(getActiveSpeech())`
4. Check Html component renders: inspect DOM for speech divs

### Speech Not Triggering

1. Verify game system calls `triggerCombatSpeech()`, `triggerHarvestSpeech()`, etc.
2. Check persona lookup: `lookupPersona(world, factionId)` returns valid string
3. Check profile has entries: `getContextSpeechByPersona(persona, "combat")` returns text
4. Check cooldown: unit needs 2 turns before speaking again
5. Console.log in `triggerSpeech()` to debug

---

## Performance Notes

### Speech Renderer (Phaser)

- Canvas texture drawn per new bubble → one-time allocation
- Sprite pooled by entity ID → reuse same object if unit speaks again
- Update loop is O(active bubbles) — typically 0-5 bubbles
- Cleanup via sprite disposal + remove from scene

### Speech Bubble Renderer (R3F)

- Html component renders every update interval (~150ms)
- Position lookup is O(units) — rebuilds only when bubbles exist
- Fade-out via CSS opacity transition
- React key ensures proper cleanup

Both are efficient for typical speech rates (0-3 bubbles per 3 seconds).

---

## Future Considerations

### DOM Projection Alternative

If we wanted DOM-projected bubbles in Phaser (instead of Sprites):
1. Create DOM div in React
2. Project unit world position to screen space
3. Position div via CSS absolute positioning
4. Use domLabels.ts utilities for world→screen projection

This would allow richer styling (CSS animations, fonts, etc.) but adds:
- React → Phaser communication overhead
- More DOM nodes (currently only Phaser canvas)
- Potential z-index layering issues

Current sprite approach is simpler and sufficient.

### Babel Fish (Multi-Language)

If units speak in different languages per faction, we'd:
1. Expand `speechProfiles.ts` to include language variants
2. Trigger function resolves faction → language → persona → profile
3. Store doesn't change (agnostic to language)
4. Renderers don't change (agnostic to language)

The architecture already supports this without modification.
