# audio/

Tone.js-based audio engine — SFX pools, volume routing, and storm ambience loop.

## Rules
- **`initAudio()` must be called after user gesture** — browsers require user interaction
- **Three volume channels** — SFX, music, ambient (each independently adjustable)
- **SFX uses object pools** — `playSfx(name)` picks from pre-created synth pools
- **Ambience is looping noise** — filtered noise for storm atmosphere
- **Dispose on unmount** — `disposeAudio()` cleans up all Tone.js nodes

## Public API
- `initAudio()` / `disposeAudio()` — lifecycle
- `isAudioInitialized()` — check readiness
- `playSfx(name)` — trigger a sound effect
- `startAmbience()` / `stopAmbience()` — storm ambience loop
- `setMasterVolume(v)`, `setSfxVolume(v)`, `setMusicVolume(v)`, `setAmbientVolume(v)`

## Files
| File | Purpose |
|------|---------|
| audioEngine.ts | Tone.js init, volume routing, master bus |
| sfx.ts | SFX definitions and playback pools |
| ambience.ts | Storm ambience noise loop |
