# Audio Design Reference

**Authoritative reference for all audio systems in Syntheteria.**

This document consolidates audio content from ENVIRONMENT.md, MECHANICS.md, COMBAT.md, and UI.md into a single complete reference. The implementation lives in `src/audio/`. Config values are in `config/audio.json`.

See also: `docs/design/world/ENVIRONMENT.md` (storm sounds, biome descriptions), `docs/design/gameplay/MECHANICS.md` (compression/harvesting feedback), `docs/design/gameplay/COMBAT.md` (combat SFX), `docs/design/interface/UI.md` (UI sounds).

---

## 1. Design Philosophy

Syntheteria's audio identity has three pillars:

**1. Procedural synthesis only.** Every sound is generated at runtime via Tone.js oscillators, noise generators, and filters. There are no audio sample files in the project. This means sounds can be modulated continuously in response to game state — storm intensity, belt speed, machine load — without needing separate assets for each variation.

**2. Physicality matches the economy.** The core game loop is tangible: you feel the screen shake when you compress powder. You hear the cube clank when it lands. The hydraulic press crescendos, the furnace hisses, the belt ticks. Every audio event reinforces that resources are physical objects with weight and presence.

**3. Spatial audio grounds you in the world.** Sounds come from the positions of machines, lightning rods, and combat events. Walking past a running smelter, you hear its deep rumble pull from the left. A lightning rod crackles from 20 meters away. The player is always located in an audio environment, not just a visual one.

---

## 2. Bus Architecture

All audio routes through a hierarchical volume bus. The bus structure is implemented in `src/audio/SoundEngine.ts`.

```
Master Bus   (masterVolume = 0.7)
  |-- SFX Bus       (sfxVolume = 1.0)    factory machinery, combat, footsteps
  |-- Music Bus     (musicVolume = 0.3)  adaptive score layers
  |-- Ambience Bus  (ambientVolume = 0.5) biome soundscapes, storm, machine hums
  `-- UI Bus        (uiVolume = 0.6)     menu clicks, alerts, HUD feedback
```

Volume levels are set in `config/audio.json` and loaded at init time. Each bus has an independent mute toggle via `AudioSettingsPanel`. All values are 0-1 linear; the engine converts to dB internally using `20 * log10(linear)`.

### Initialization

Audio must not start before user interaction (browser autoplay policy). `AudioSystem.tsx` listens for the first `click` or `touchstart` event, then calls `initAudio()` followed by `initAudioBridge()`. If init fails, the listeners re-register for the next interaction.

---

## 3. Spatial Audio

**Source:** `src/audio/SpatialAudio.ts`

Sounds placed in 3D world space use `Tone.Panner3D` with HRTF panning model and inverse distance model. The listener position is updated every frame from the camera position via `setListenerPosition()`.

```typescript
// Listener update (called each frame from render loop)
setListenerPosition({ x: camera.x, y: camera.y, z: camera.z });

// Positioned one-shot (e.g. combat hit at target location)
playSpatial(position, factory, { maxDistance: 40, refDistance: 2 });
```

**Spatial sounds in use:**

| Function | Trigger | maxDistance | refDistance |
|----------|---------|-------------|-------------|
| `playSpatialMetalImpact` | Combat hit at unit world position | 40m | 2m |
| `playSpatialMachineHum` | Fabrication unit / lightning rod (looping) | 30m | 2m |
| `playSpatialCrackle` | Lightning rod discharge | 35m | 3m |

On the `low` quality tier, `isSpatialAllowed()` returns false and sounds fall back to non-spatial mono playback.

---

## 4. SFX Library

All game sounds are procedurally generated. No audio files are required.

### 4.1 Core Loop SFX

These sounds are wired to game events via `AudioEventBridge.ts` and fire automatically.

**Harvesting / Grinding**
- **Source:** `playGrinding()` in `GameSounds.ts`, `playHarvesting()` in `SynthSounds.ts`
- **Synthesis:** White noise → bandpass filter (1200 Hz, Q=6) + LFO modulating filter frequency (14 Hz, 800–1600 Hz sweep)
- **Config:** `config/audio.json` `sfx.grinding` — filterFrequency, filterQ, lfoRate, volumeDb
- **Trigger:** `onResourceGain` callback from `resources.ts`; also fires when `isHarvesting` state transitions true in the core loop snapshot
- **Design note from MECHANICS.md:** The grinding sound accompanies the grinding animation and particles. The player holds the action button; audio plays continuously while contact is maintained.

**Compression**
- **Source:** `playCompression()` in `GameSounds.ts`, `playCompressionThump()` in `SynthSounds.ts`
- **Synthesis:** Rising sine tone (200 Hz → 800 Hz over 300ms) + low thump at peak (60 Hz sine, short decay). `SynthSounds` variant uses a `MembraneSynth` for the thump plus a noise transient burst.
- **Config:** `config/audio.json` `sfx.compression` — riseFrequency, riseDuration, thumpFrequency, volumeDb
- **Trigger:** `isCompressing` state transitions true in core loop snapshot
- **Design note from MECHANICS.md:** "Sound — hydraulic press crescendo." Compression overlay shows "# COMPRESSING SCRAP ORE..." HUD with pressure/temperature indicators. Audio is designed to match the visual escalation.

**Hydraulic Press (cube eject)**
- **Source:** `playHydraulicPress()` in `SFXLibrary.ts`
- **Synthesis:** Sawtooth pressure build (descending sweep 80→40 Hz over releaseDecay) + `MembraneSynth` slam at peak + noise burst transient
- **Config:** `config/audio.json` `sfx.hydraulicPress` — pressFrequency (40 Hz), releaseDecay (0.4s), volumeDb (-4 dB)
- **Use:** More dramatic than `playCompression`; used specifically for the final cube eject moment

**Cube Pickup**
- **Source:** `playCubePickup()` in `SynthSounds.ts`
- **Synthesis:** `MetalSynth` (harmonicity=5.1, modulationIndex=20, resonance=4000) with tight envelope (decay 40ms). Brief high-frequency click simulating magnetic lock.
- **Trigger:** `heldCubeId` transitions from null to a value in core loop snapshot

**Cube Drop**
- **Source:** `playCubeDrop()` in `SynthSounds.ts`
- **Synthesis:** Triangle oscillator (120 Hz) with quick pitch ramp to 40 Hz + brown noise transient. Low-frequency impact of heavy cube hitting ground.
- **Trigger:** `heldCubeId` transitions from value to null in core loop snapshot

**Cube Place (building placement)**
- **Source:** `playCubePlace()` in `GameSounds.ts`
- **Synthesis:** Triangle oscillator (80 Hz) + brown noise through reverb (decay 1.5s, wet 0.5). Solid thunk with tail.
- **Trigger:** `onBuildingPlaced()` from `AudioEventBridge.ts`, or via fabrication job completion
- **Design note from MECHANICS.md:** "Snap sound plays (metallic clank, pitch varies by material)." Current implementation uses a fixed 80 Hz thunk; material-based pitch variation is a future enhancement.

**Cube Grab (selection)**
- **Source:** `playCubeGrab()` in `GameSounds.ts`
- **Synthesis:** White noise through resonant bandpass (2200 Hz, Q=8), filter sweeping down to 800 Hz over 120ms. Metal sliding against metal.
- **Trigger:** `onSelectionChange` with non-null new selection id

### 4.2 Factory Machine SFX

These are looping sounds attached to running machines. All return a stop function.

**Belt Motor**
- **Source:** `playBeltMotor()` in `FactoryAudio.ts`
- **Synthesis:** 40 Hz sawtooth + lowpass (120 Hz) layered with brown noise bandpass (200 Hz)
- **Looping:** Yes, returns stop function

**Belt Clank (cube transfer)**
- **Source:** `playBeltClank()` in `SFXLibrary.ts`, `playBeltItem()` in `FactoryAudio.ts`
- **Synthesis:** `MetalSynth` (harmonicity=3.5, modulationIndex=12, resonance=2500) with fast decay (80ms)
- **Config:** `config/audio.json` `sfx.beltClank` — frequency (200 Hz), decayMs, volumeDb

**Belt Hum (conveyor ambient)**
- **Source:** `playBeltHum()` in `SynthSounds.ts`
- **Synthesis:** 50 Hz sawtooth through lowpass (150 Hz) with slow LFO modulation (0.5 Hz, 45–55 Hz)
- **Looping:** Yes, routes to ambience bus

**Drill Sound**
- **Source:** `playDrillSound()` in `FactoryAudio.ts`
- **Synthesis:** 200 Hz sawtooth with LFO (8 Hz, 150–250 Hz sweep) through lowpass (600 Hz)
- **Looping:** Yes

**Processor Hum (smelter / refiner / separator)**
- **Source:** `playProcessorHum(type)` in `FactoryAudio.ts`
- **Smelter:** 30 Hz sawtooth + lowpass (80 Hz) + brown noise under 100 Hz. Deep thermal rumble.
- **Refiner:** 800 Hz sine with vibrato LFO (5 Hz, 780–820 Hz) through lowpass (1200 Hz). High electronic whine.
- **Separator:** 60 Hz square with tremolo LFO (3 Hz) gating gain. Rhythmic pulse.
- **Looping:** Yes (all variants)

**Furnace Roar**
- **Source:** `playFurnaceRoar()` in `SFXLibrary.ts`
- **Synthesis:** Brown noise fire layer → lowpass (200 Hz, config-driven) + sine sizzle tone (80 Hz, config-driven) with slow tremolo LFO (0.3 Hz)
- **Config:** `config/audio.json` `sfx.furnace` — noiseFilterFrequency, sizzleFrequency, volumeDb
- **Looping:** Yes, routes to ambience bus

**Magnetic Hum (grabber)**
- **Source:** `playMagneticHum()` in `SFXLibrary.ts`
- **Synthesis:** Sine oscillator (120 Hz) with vibrato (4 Hz, ±6 Hz depth)
- **Config:** `config/audio.json` `sfx.magneticHum` — frequency, vibratoRate, vibratoDepth, volumeDb (-18 dB)
- **Looping:** Yes, returns stop function

**Machine Hum (generic)**
- **Source:** `playMachineHum()` in `GameSounds.ts`, `playSpatialMachineHum()` in `SpatialAudio.ts`
- **Synthesis:** 60 Hz sawtooth through lowpass (200 Hz) at -24 dB
- **Spatial variant:** `playSpatialMachineHum` positions the hum at a 3D world coordinate

**Footstep**
- **Source:** `playFootstep()` in `FactoryAudio.ts`
- **Synthesis:** White noise through bandpass (~2000 Hz, Q=4) with short envelope (decay 60ms). Randomized filter frequency (1800–2200 Hz) and volume for variation.

**Hacking Noise**
- **Source:** `playHackingNoise()` in `FactoryAudio.ts`
- **Synthesis:** White noise through `BitCrusher` (4-bit) + fast frequency-sweeping bandpass LFO (12 Hz, 60–2000 Hz sweep). Digital interference character.
- **Looping:** Yes, returns stop function

### 4.3 Combat SFX

**Metal Impact (combat hit)**
- **Source:** `playMetalImpact()` in `GameSounds.ts`
- **Synthesis:** `MetalSynth` (harmonicity=3.1, modulationIndex=16, resonance=2000) at C2, decay 200ms
- **Spatial variant:** `playSpatialMetalImpact` places the hit at the target unit's world position

**Damage (component damage)**
- **Source:** `playDamage()` in `GameSounds.ts`
- **Synthesis:** White noise → `Distortion` (0.8) → lowpass (1000 Hz) with 100ms envelope

**Damage Taken (player hit)**
- **Source:** `playDamageTaken()` in `SynthSounds.ts`
- **Synthesis:** Sawtooth (100 Hz) → `Distortion` (0.9) → lowpass (1500 Hz) with rapid LFO frequency modulation (30 Hz). Harsh electrical buzz simulating bot system damage.

**Laser Shot (projectile)**
- **Source:** `playLaserShot()` in `SFXLibrary.ts`
- **Synthesis:** Sine oscillator sweeping 2000 → 400 Hz over 120ms
- **Config:** `config/audio.json` `sfx.laserShot` — startFrequency, endFrequency, duration, volumeDb

**Combat Impact (structural damage)**
- **Source:** `playCombatImpact()` in `SFXLibrary.ts`
- **Synthesis:** Brown noise → `Distortion` (0.6) → lowpass (800 Hz) with short decay
- **Config:** `config/audio.json` `sfx.combatImpact` — noiseDecay, filterFrequency, volumeDb

**Alert (enemy detected)**
- **Source:** `playAlert()` in `GameSounds.ts`
- **Synthesis:** Two ascending square-wave tones (E5 then A5, 100ms apart). Routes to UI bus.
- **Trigger:** Enemy count increases while already having awareness (throttled to 3000ms)
- **Design note from UI.md open question:** "What happens to the HUD during a raid alert — full-screen flash, border pulse, alarm sound?" The alarm sound is this two-tone beep; visual treatment (border pulse, flash) is still an open item.

**Cultist Lightning**
- **Source:** `playCultistLightning()` in `FactoryAudio.ts`
- **Synthesis:** White noise burst (lowpass 2000 Hz, long release 2s) + descending sine sweep (3000→200 Hz over 600ms) + reverb tail (decay 3s, wet 0.6). Louder and longer than regular lightning.

### 4.4 UI SFX

**UI Beep (menu interaction)**
- **Source:** `playUIBeep()` in `GameSounds.ts`
- **Synthesis:** Square wave (C5, 30ms). Tiny click for button presses and confirmations.
- **Trigger:** `onUIInteraction()` from AudioEventBridge; also fires from AudioSettingsPanel mute toggles

**Power Up (machine online)**
- **Source:** `playPowerUp()` in `SynthSounds.ts`
- **Synthesis:** Two sine oscillators (200→600 Hz, 400→1200 Hz) ascending over 400ms with slight stagger

**Quest Complete (otter milestone)**
- **Source:** `playQuestComplete()` in `SynthSounds.ts`
- **Synthesis:** Triangle synth with reverb (decay 1.5s) playing C5–E5–G5 arpeggio at 120ms intervals (major triad)
- **Trigger:** `onQuestComplete` callback from `questSystem.ts`; also plays for game victory, followed by `playPowerUp` 400ms later

---

## 5. Ambient Soundscapes

### 5.1 Biome Ambience

**Source:** `src/audio/BiomeAmbience.ts`

Each biome has a distinct layered soundscape. Transitions crossfade over 2 seconds (fade-in) / 1.5 seconds (fade-out). Requires `biomeAmbienceEnabled: true` in the quality tier (disabled on `low` tier).

Call `setBiome(biomeId)` when the player's biome changes. The system handles the crossfade automatically.

**Note on biome name mapping:** `BiomeAmbience.ts` uses the identifiers `rust_plains`, `scrap_hills`, `crystal_flats`, `deep_forge`, `storm_ridge`. `ENVIRONMENT.md` describes biomes as `rust_plains`, `scrap_hills`, `chrome_ridge`, `signal_plateau`, `cable_forest`. The audio biome names are audio-design identifiers, not direct mappings to environment system biome names. This is a known gap — see Section 8 (Gaps).

| Audio Biome ID | Sound Character | Synthesis |
|----------------|-----------------|-----------|
| `rust_plains` | Industrial hum + distant machinery | Sawtooth (55 Hz) through lowpass + slow LFO; brown noise bandpass (400 Hz) for distant machinery |
| `scrap_hills` | Metallic wind through debris | Pink noise through auto-filter (0.2 Hz sweep, 300 Hz base, 2.5 octaves); white noise bandpass (1800 Hz, Q=4) with LFO-gated amplitude for debris rattles |
| `crystal_flats` | High crystalline drones | 4 stacked sine harmonics (220, 330, 440, 550 Hz) through reverb (decay 4s); white noise through highpass (4000 Hz) for shimmer |
| `deep_forge` | Sub-bass rumble + sparks | Sawtooth (28 Hz) through lowpass (60 Hz); white noise through highpass (3500 Hz) with LFO square-gated bursts at 7 Hz |
| `storm_ridge` | Howling wind + crackle | Brown noise through fast auto-filter (0.6 Hz sweep, 100 Hz base, 3.5 octaves, depth 0.9); white noise through highpass (4500 Hz) with LFO square gate at 12 Hz |

### 5.2 Storm Ambience

**Source:** `src/audio/StormAmbience.ts`

The storm ambience is a persistent layered soundscape that runs at all times (started in `initAudio` via `SpatialAudio.ts`). It modulates in real-time based on `stormIntensity` (0–1.5), called from `AudioSystem.tsx` every frame via `updateStormIntensity()`.

**Three layers:**

| Layer | Synthesis | Intensity Behavior |
|-------|-----------|-------------------|
| Wind | Brown noise through `AutoFilter` (0.15 Hz sweep, 80 Hz base, 3 octaves) | Volume: -24 dB (calm) to -4 dB (extreme); filter sweep rate: 0.08–0.48 Hz |
| Rain static | Pink noise through lowpass (600 Hz) | Fades in above 30% intensity; volume: -18 dB (30%) to -6 dB (extreme); filter opens to 1000 Hz |
| Electrical crackle | White noise through highpass (4000 Hz), square-gated by LFO | Appears above 40% intensity; LFO rate: 4–20 Hz bursts |

**Config:** `config/audio.json` `stormAmbienceVolume` (default 0.4, applied as base dB level across all layers).

**One-shot storm events:**

| Function | Description |
|----------|-------------|
| `playThunder()` | Brown noise (120–200 Hz lowpass, -24 rolloff) + white noise crack, 2–3.5s total decay |
| `playElectricalCrackle()` | White noise + `BitCrusher` (3-bit) + highpass (3000–5000 Hz), 80–140ms burst |
| `playLightningStrike()` | White noise through lowpass (800 Hz) descending, 0.8s trigger with 1.5s release |

**Trigger logic from AudioEventBridge:** `playLightningStrike()` fires when `stormIntensity > 1.2` AND at least one lightning rod exists, throttled to 8 seconds between strikes. `playSpatialCrackle()` then fires at a random rod's world position.

**Design note from ENVIRONMENT.md:** Lightning strike cosmetics specify "flash, thunder sound, scorch mark." The audio side (thunder + spatial crackle) is implemented; the visual flash and scorch mark are rendering concerns.

**Design note from ENVIRONMENT.md (sinkhole):** "Subtle rumbling sound" 30 seconds before a sinkhole collapses. This is described but not yet wired in AudioEventBridge.

---

## 6. Adaptive Music

**Source:** `src/audio/AdaptiveMusic.ts`

The music system uses Tone.js Transport for synchronized BPM-locked layers. A persistent base drone is always present; state-specific layers crossfade in and out over 1.5 seconds.

### 6.1 Base Drone (always present)

Two detuned sine oscillators (110 Hz, 110.5 Hz) through long reverb (decay 6s, wet 0.7) at -16 dB. Creates an ever-present ambient hum that anchors the game's machine-planet identity.

### 6.2 Music States

| State | Trigger | Additional Layer | BPM |
|-------|---------|-----------------|-----|
| `explore` | Default, low threat | None (drone only) | 80 |
| `build` | Active factory operation | Hi-hat (MetalSynth, 8th notes) + kick (MembraneSynth, quarter notes on beats 1 and 4) | 80 |
| `combat` | Active combat engagement | Sawtooth lead (distorted, power-chord sequence C3–G3–Bb2–G2) | 100 |
| `raid` | Enemy raid incoming | Square-wave stab arpeggio (E3–G3 minor third pattern, sparse 16th note hits) | 80 |
| `victory` | Victory condition met | Triangle synth ascending arpeggio (C4–E4–G4–C5 major triad) with reverb | 80 |

### 6.3 Calling the Music System

```typescript
import { startAdaptiveMusic, setMusicState } from './audio';

// On game start (after initAudio)
startAdaptiveMusic();

// State changes (call from game state watchers)
setMusicState('combat');   // enemy engagement
setMusicState('raid');     // raid wave incoming
setMusicState('build');    // back to factory mode
setMusicState('victory');  // game won
```

### 6.4 Quality Tier Behavior

Adaptive music is always enabled (`adaptiveMusicEnabled: true`) on all tiers in `config/audio.json`. Only explicitly setting `adaptiveMusicEnabled: false` will stop it. This is intentional: the base drone is minimal CPU cost and gives the game its tonal identity even on low-end devices.

---

## 7. Audio Quality Tiers

**Source:** `src/audio/AudioQuality.ts`, `config/audio.json` `qualityTiers`

Quality tier is detected from GPU capabilities via `src/rendering/QualityTier.ts`. Call `applyAudioQuality()` after `detectQualityTier()` to push settings into audio subsystems.

| Setting | High | Medium | Low |
|---------|------|--------|-----|
| `maxPolyphony` | 32 voices | 16 voices | 8 voices |
| `spatialAudioEnabled` | Yes (Panner3D, HRTF) | Yes | No (mono, no distance) |
| `biomeAmbienceEnabled` | Yes | Yes | No |
| `adaptiveMusicEnabled` | Yes | Yes | Yes |
| `reverbEnabled` | Yes | No | No |

**Voice management:** `acquireVoice()` returns false when `activeVoices >= maxPolyphony`. Callers should check this before creating new sound nodes to prevent polyphony overflow. `releaseVoice()` is called in each sound's dispose callback.

**Reverb gate:** Check `isReverbAllowed()` before creating any `Tone.Reverb` node. Reverb is CPU-expensive; medium and low tiers skip it entirely.

**Spatial gate:** Check `isSpatialAllowed()` before creating `Tone.Panner3D`. Low-tier falls back to direct bus connection.

---

## 8. Event Bridge

**Source:** `src/audio/AudioEventBridge.ts`

The AudioEventBridge is the coupling layer between gameplay systems and audio, following a strict separation principle: audio code never imports from game systems directly (except via the bridge). The bridge subscribes to events and callbacks, then calls audio functions.

**Subscriptions:**

| Subscription | Source | Audio Action |
|--------------|--------|-------------|
| `onResourceGain` | `resources.ts` | `playGrinding()` throttled 800ms |
| `onSelectionChange` (non-null) | `selectionState.ts` | `playCubeGrab()` throttled 200ms |
| `subscribeCoreLoop` — `isHarvesting` rising edge | `CoreLoopSystem.ts` | `playGrinding()` throttled 300ms |
| `subscribeCoreLoop` — `isCompressing` rising edge | `CoreLoopSystem.ts` | `playCompression()` throttled 500ms |
| `subscribeCoreLoop` — compression end | `CoreLoopSystem.ts` | `playCubePlace()` throttled 300ms |
| `subscribeCoreLoop` — cube pickup | `CoreLoopSystem.ts` | `playCubePickup()` throttled 200ms |
| `subscribeCoreLoop` — cube drop | `CoreLoopSystem.ts` | `playCubeDrop()` throttled 200ms |
| `onQuestComplete` | `questSystem.ts` | `playQuestComplete()` throttled 1000ms |
| `onGameOver` (win) | `gameOverDetection.ts` | `playQuestComplete()` then `playPowerUp()` after 400ms |
| `onGameOver` (loss) | `gameOverDetection.ts` | `playDamageTaken()` |
| `subscribe(gameState)` — combat events | `gameState.ts` | `playSpatialMetalImpact` (with position) or `playDamage()` |
| `subscribe(gameState)` — fabrication started | `gameState.ts` | `playCompression()` throttled 500ms |
| `subscribe(gameState)` — fabrication complete | `gameState.ts` | `playUIBeep()` throttled 300ms |
| `subscribe(gameState)` — new enemies detected | `gameState.ts` | `playAlert()` throttled 3000ms |
| `subscribe(gameState)` — stormIntensity > 1.2 + rods | `gameState.ts` | `playLightningStrike()` + `playSpatialCrackle()` throttled 8000ms |

**Direct call helpers (optional):**

| Function | When to call |
|----------|--------------|
| `onBuildingPlaced()` | From `buildingPlacement.ts` callbacks |
| `onUIInteraction()` | From any button click or menu open |

---

## 9. Settings Panel

**Source:** `src/audio/AudioSettingsPanel.tsx`

A React component (`AudioSettingsPanel`) provides volume sliders and mute toggles for all buses. Styled in the terminal aesthetic (monospace, `#00ffaa` on black, scanlines).

Default values (matching `config/audio.json`):

| Bus | Default Volume |
|-----|---------------|
| Master | 70% |
| SFX | 100% |
| Music | 30% |
| Ambience | 50% |
| UI | 60% |

The settings panel is accessed from the SETTINGS button on the Title Screen and from the Pause Menu SETTINGS option. It writes directly to `SoundEngine` via `setMasterVolume()` / `setCategoryVolume()` — no persistence layer yet (volumes reset on reload).

---

## 10. Config Reference

`config/audio.json` — all tunable audio values.

| Key | Default | Description |
|-----|---------|-------------|
| `masterVolume` | 0.7 | Master bus linear volume |
| `sfxVolume` | 1.0 | SFX bus linear volume |
| `ambientVolume` | 0.5 | Ambience bus linear volume |
| `musicVolume` | 0.3 | Music bus linear volume |
| `uiVolume` | 0.6 | UI bus linear volume |
| `stormAmbienceVolume` | 0.4 | Storm layer base dB offset |
| `combatSfxVolume` | 0.8 | Combat SFX volume scalar |
| `uiFeedbackVolume` | 0.6 | UI feedback volume scalar |
| `qualityTiers.high.maxPolyphony` | 32 | Max voices, high tier |
| `qualityTiers.medium.maxPolyphony` | 16 | Max voices, medium tier |
| `qualityTiers.low.maxPolyphony` | 8 | Max voices, low tier |
| `sfx.grinding.filterFrequency` | 1200 | Grinding bandpass center Hz |
| `sfx.grinding.filterQ` | 6 | Grinding filter resonance |
| `sfx.grinding.lfoRate` | 14 | Grinding LFO Hz |
| `sfx.grinding.volumeDb` | -8 | Grinding volume offset |
| `sfx.compression.riseFrequency` | 800 | Compression peak frequency Hz |
| `sfx.compression.riseDuration` | 0.3 | Compression sweep duration seconds |
| `sfx.compression.thumpFrequency` | 60 | Compression thump Hz |
| `sfx.compression.volumeDb` | -6 | Compression volume offset |
| `sfx.furnace.noiseFilterFrequency` | 200 | Furnace fire filter Hz |
| `sfx.furnace.sizzleFrequency` | 80 | Furnace sizzle tone Hz |
| `sfx.furnace.volumeDb` | -10 | Furnace volume offset |
| `sfx.hydraulicPress.pressFrequency` | 40 | Press sawtooth floor Hz |
| `sfx.hydraulicPress.releaseDecay` | 0.4 | Press sweep duration seconds |
| `sfx.hydraulicPress.volumeDb` | -4 | Press volume offset |
| `sfx.magneticHum.frequency` | 120 | Grabber hum fundamental Hz |
| `sfx.magneticHum.vibratoRate` | 4 | Grabber vibrato LFO Hz |
| `sfx.magneticHum.vibratoDepth` | 6 | Grabber vibrato depth Hz |
| `sfx.magneticHum.volumeDb` | -18 | Grabber hum volume offset |
| `sfx.beltClank.frequency` | 200 | Belt clank resonance Hz |
| `sfx.beltClank.decayMs` | 80 | Belt clank decay milliseconds |
| `sfx.beltClank.volumeDb` | -14 | Belt clank volume offset |
| `sfx.laserShot.startFrequency` | 2000 | Laser start sweep Hz |
| `sfx.laserShot.endFrequency` | 400 | Laser end sweep Hz |
| `sfx.laserShot.duration` | 0.12 | Laser sweep duration seconds |
| `sfx.laserShot.volumeDb` | -8 | Laser volume offset |
| `sfx.combatImpact.noiseDecay` | 0.1 | Combat impact noise decay seconds |
| `sfx.combatImpact.filterFrequency` | 800 | Combat impact lowpass Hz |
| `sfx.combatImpact.volumeDb` | -6 | Combat impact volume offset |

---

## 11. Source File Map

| File | Responsibility |
|------|---------------|
| `src/audio/SoundEngine.ts` | Bus creation, volume control, one-shot and loop playback API |
| `src/audio/SpatialAudio.ts` | 3D Panner3D, listener position, spatial one-shots |
| `src/audio/AudioEventBridge.ts` | Game event → SFX wiring, throttle logic |
| `src/audio/GameSounds.ts` | Core loop SFX: grinding, compression, cube, alert, damage, UI, lightning |
| `src/audio/SynthSounds.ts` | Procedural game-event SFX: harvesting, thump, pickup, drop, belt hum, power up, damage taken, quest complete |
| `src/audio/SFXLibrary.ts` | Config-driven factory + combat SFX: furnace, hydraulic press, magnetic hum, belt clank, laser, combat impact |
| `src/audio/FactoryAudio.ts` | Machine SFX: belt motor, drill, processor hum variants, hacking noise, footstep, belt item transfer, cultist lightning |
| `src/audio/StormAmbience.ts` | Storm layers (wind, rain, crackle), updateStormAudio, playThunder, playElectricalCrackle |
| `src/audio/BiomeAmbience.ts` | Per-biome soundscapes with crossfade: rust_plains, scrap_hills, crystal_flats, deep_forge, storm_ridge |
| `src/audio/AdaptiveMusic.ts` | Adaptive score: base drone + explore/build/combat/raid/victory layers |
| `src/audio/AudioQuality.ts` | Quality tier integration: polyphony, spatial, reverb, biome flags |
| `src/audio/AudioSystem.tsx` | R3F component: deferred init, frame-based storm update |
| `src/audio/AudioSettingsPanel.tsx` | Volume slider UI component (terminal aesthetic) |
| `src/audio/index.ts` | Barrel export of all public audio APIs |

---

## 12. Known Gaps

The following are audio behaviors described in design documents or implied by gameplay systems that are not yet implemented or wired:

| Gap | Location Described | Status |
|-----|--------------------|--------|
| Sinkhole warning rumble (30s before collapse) | `ENVIRONMENT.md` sinkhole section | Not wired in AudioEventBridge |
| Material-based cube placement pitch variation | `MECHANICS.md` section 8 ("snap sound, pitch varies by material") | Fixed pitch only; no material variation |
| Raid alert visual + audio combination | `UI.md` open question #6 | Audio (alert beep) implemented; border pulse/flash not wired |
| Biome audio ID mapping to environment biome IDs | `ENVIRONMENT.md` biomes vs `BiomeAmbience.ts` IDs | Audio uses `crystal_flats`, `deep_forge`, `storm_ridge`; env doc uses `chrome_ridge`, `signal_plateau`, `cable_forest` — mapping not formalized |
| Volume persistence (save/load) | `UI.md` settings | Volumes reset on page reload; not saved to IndexedDB / expo-sqlite |
| Storm weather type differentiation | `ENVIRONMENT.md` has 5 weather states | Audio has storm intensity scalar only; no separate Acid Rain, EM Surge, or Overcast audio layers |
| Faction-specific audio themes | Design intent implied by 4 distinct factions | No faction-specific music or SFX variations implemented |
| EM Surge audio signature | `ENVIRONMENT.md` section on EM Surge effects | No dedicated audio for navigation disruption, signal degradation |
| `FactoryAudio.ts` connects directly to `Tone.Destination` | `FactoryAudio.ts` line 15 creates `factoryVolume = new Tone.Volume(-6).toDestination()` bypassing SoundEngine buses | Category volume controls and master volume do not affect FactoryAudio sounds |
