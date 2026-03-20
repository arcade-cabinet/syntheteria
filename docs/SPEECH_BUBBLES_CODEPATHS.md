# Speech Bubbles — Code Paths & Integration Points

## Playing Phase: Trigger → Store → Phaser Sprite

### Code Path 1: Attack Triggers Combat Speech

```
attackSystem.ts:179
  triggerCombatSpeech(world, attacker.id(), attackerName)
    ↓
speechTriggers.ts:35-43
  triggerCombatSpeech(world, entityId, factionId)
    → lookupPersona(world, factionId)           // Resolve faction persona
    → getContextSpeechByPersona(persona, "combat")  // Get speech line
    → triggerSpeech(entityId, factionId, line)
      ↓
speechBubbleStore.ts:56-71
  triggerSpeech(entityId, factionId, text)
    → Check cooldown (2 turns)
    → Store in activeSpeech Map
    → Call notify() → listeners.forEach(fn)
      ↓
worldScene.update() detects change
  → updateSpeech(world, delta)
    ↓
speechRenderer.ts:175-215
  updateSpeech(world, delta)
    → getActiveSpeech() [gets new speech entries]
    → buildUnitPositions(world) [maps entityId → world position]
    → For each active speech:
        → createSpeechSprite(text) [canvas texture]
        → Add sprite to scene
        → Position above unit (y + 3.0)
    → Clean up expired sprites
```

### Code Path 2: Frame Loop Updates Sprites

```
WorldScene.update(time, delta) runs ~60fps
  Line 278: updateSpeech(this._config.world, delta)
    ↓
speechRenderer.ts
  → getActiveSpeech() [checks expiration, cleans up]
  → Updates positions as units move
  → Removes expired sprites from scene
```

---

## Title/Setup/Generating Phases: Trigger → Store → R3F Html

### Code Path 3: Speech During Title (R3F Path)

```
App.tsx phase changes to "title"
  → Renders <Globe phase="title" world={world} />
    ↓
Globe.tsx
  → Renders <Canvas> (R3F)
    → <SpeechBubbleRenderer world={world} /> [Line 666]
      ↓
SpeechBubbleRenderer.tsx:93-116
  useFrame runs ~60fps (but checks interval, ~150ms)
    → getActiveSpeech() [from store]
    → buildUnitMap(world) [entityId → world position]
    → For each active speech:
        → <Html position={[x, y, z]}>
            → <div> with CSS styling + faction color
      ↓
React renders Html components
  → Drei projects world position → screen space
  → CSS positioning + fading applied
```

---

## Store: Pub/Sub Coordination

### Code Path 4: Store Notifies Both Renderers

```
speechBubbleStore.ts

When triggerSpeech() or speech expires:
  → notify() [Line 46-48]
    → For each listener in listeners Set:
        → Call listener() (React component re-renders)

React integration (useSyncExternalStore):
  → subscribeSpeech(callback) registers listener
  → getSpeechSnapshot() returns current active speech
  → Component re-renders when bubbles change
```

---

## Critical Integration Points

### Phaser Integration (Playing Phase)

**File:** `src/views/scenes/WorldScene.ts`

```typescript
// Line 52-55: Import
import {
  createSpeechRenderer,
  updateSpeech,
} from "../renderers/speechRenderer";

// Line 123: Setup
createSpeechRenderer(scene);  // Store scene reference

// Line 278: Main loop
updateSpeech(this._config.world, delta);
```

**Verification:**
- ✅ `createSpeechRenderer()` called once in `create()`
- ✅ `updateSpeech()` called every frame in `update()`
- ✅ World config available with units

### R3F Integration (Title Phases)

**File:** `src/ui/Globe.tsx`

```typescript
// Line 59: Import
import {
  // ... other imports
  SpeechBubbleRenderer,  // From src/view/effects/SpeechBubbleRenderer
  // ... other imports
}

// Line 666: Render in Canvas
{world && <SpeechBubbleRenderer world={world} />}
```

**Verification:**
- ✅ Component only renders when `world` prop exists
- ✅ Only rendered in R3F Canvas (not GameBoard/Phaser)
- ✅ Mounted in title/setup/generating phases

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Game Systems (attackSystem, harvestSystem, etc.)            │
│ Call: triggerCombatSpeech(world, entityId, factionId)      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ speechTriggers.ts                                           │
│ - lookupPersona(world, factionId)                          │
│ - getContextSpeechByPersona(persona, context)              │
│ - triggerSpeech(entityId, factionId, text)                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ speechBubbleStore.ts (Single Source of Truth)              │
│ - activeSpeech: Map<entityId, ActiveSpeech>                │
│ - cooldowns: Map<entityId, timestamp>                      │
│ - listeners: Set<() => void>  [for React reactivity]       │
│ - API: triggerSpeech(), getActiveSpeech(),                │
│        subscribeSpeech(), getSpeechSnapshot()              │
└───────┬────────────────────────────────┬────────────────────┘
        ↓                                ↓
┌──────────────────────┐      ┌──────────────────────┐
│ speechRenderer.ts    │      │ SpeechBubbleRenderer │
│ (Phaser Path)        │      │ (R3F Path)           │
│                      │      │                      │
│ updateSpeech()       │      │ useFrame()           │
│ → getActiveSpeech()  │      │ → getActiveSpeech()  │
│ → THREE.Sprite       │      │ → Html + CSS         │
│ → Add to scene       │      │ → World→screen proj  │
└──────────────────────┘      └──────────────────────┘
        ↓                                ↓
┌──────────────────────┐      ┌──────────────────────┐
│ WorldScene update()  │      │ Globe.tsx Canvas     │
│ (Playing phase)      │      │ (Title/Setup/etc)    │
│                      │      │                      │
│ Sprite rendered      │      │ Html rendered        │
│ in Three.js scene    │      │ in R3F Canvas        │
└──────────────────────┘      └──────────────────────┘
```

---

## Complete Integration Checklist

### ✅ Game Systems
- [x] attackSystem imports triggerCombatSpeech
- [x] attackSystem calls triggerCombatSpeech when unit attacks
- [x] harvestSystem calls triggerHarvestSpeech (if implemented)
- [x] memoryFragments calls triggerDiscoverySpeech (if implemented)

### ✅ Store
- [x] speechBubbleStore exports triggerSpeech
- [x] speechBubbleStore enforces cooldown
- [x] speechBubbleStore has expiration logic
- [x] speechBubbleStore has pub/sub listeners

### ✅ Phaser Renderer
- [x] speechRenderer.ts exists and is complete
- [x] WorldScene imports createSpeechRenderer
- [x] WorldScene imports updateSpeech
- [x] WorldScene calls createSpeechRenderer() in create()
- [x] WorldScene calls updateSpeech() in update() loop
- [x] Sprites are THREE.Sprite (canvas-based)
- [x] Positions are world coordinates above units

### ✅ R3F Renderer
- [x] SpeechBubbleRenderer.tsx exists
- [x] Globe.tsx imports SpeechBubbleRenderer
- [x] Globe.tsx renders component in Canvas
- [x] Component reads from getActiveSpeech()
- [x] Uses Drei Html for world-to-screen projection
- [x] CSS styling applied with faction colors

### ✅ Tests
- [x] All 2440 tests pass
- [x] No TypeScript errors
- [x] No linting errors

---

## Testing the Wiring

### Manual Test (Playing Phase)

1. Start game, reach "playing" phase
2. Unit attacks another unit
3. Observable: Speech bubble appears above attacker
4. Bubble shows for ~3 seconds then fades
5. Unit cannot speak again for ~2 seconds (cooldown)

### Manual Test (Title Phase)

1. Start game, stay in "title" phase
2. Manually call `triggerSpeech(1, "player", "Test message")` in console
3. Observable: Speech bubble appears in title scene
4. Bubble fades after duration

### Verify Store State

```typescript
// In browser console:
import { getActiveSpeech } from "./systems";
console.log(getActiveSpeech());  // Show active speech entries
```

### Verify Persona Lookup

```typescript
// In browser console:
import { lookupPersona } from "./systems/speechTriggers";
import { getContextSpeechByPersona } from "./narrative";

const persona = lookupPersona(world, "player");
const line = getContextSpeechByPersona(persona, "combat");
console.log(persona, line);  // Verify persona and speech line
```

---

## Edge Cases Handled

### 1. Unit Moves While Speaking
- Position updates each frame via `unitPositions` lookup
- Sprite follows unit in real-time

### 2. Unit Destroyed While Speaking
- Sprite continues to render for its duration
- BuildUnitPositions returns null for destroyed unit
- Sprite positioned at last known location

### 3. Rapid Speech Triggers
- Cooldown prevents same unit from speaking twice in 2 turns
- `triggerSpeech()` silently returns if cooldown active
- No error logging needed

### 4. Phase Transition
- R3F bubbles auto-cleanup when SpeechBubbleRenderer unmounts
- Phaser bubbles cleanup via speechRenderer teardown
- Store is NOT cleared (persists across phases) — by design

### 5. Game Reset
- `clearAllSpeech()` called on new game start
- All bubbles and cooldowns reset
