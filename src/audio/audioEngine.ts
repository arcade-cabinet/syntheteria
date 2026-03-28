/**
 * Audio Engine — Core Tone.js setup with volume channels.
 *
 * Provides master, SFX, music, and ambient volume channels.
 * All audio in the game routes through these channels.
 *
 * Tone.js is LAZY-IMPORTED on first initAudio() call to avoid
 * creating an AudioContext before any user gesture (browser policy).
 */

// import type is compile-time only — no AudioContext created at module load
import type { Gain } from "tone";

// Runtime module ref — populated by dynamic import in initAudio()
let Tone: typeof import("tone") | null = null;

let masterGain: Gain | null = null;
let sfxGain: Gain | null = null;
let musicGain: Gain | null = null;
let ambientGain: Gain | null = null;

let initialized = false;

// ─── Volume State (0-1 linear) ───────────────────────────────────────────────

let masterVolume = 0.8;
let sfxVolume = 0.7;
let musicVolume = 0.5;
let ambientVolume = 0.6;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the audio engine. Call once on first user gesture (click/tap).
 * Lazy-imports Tone.js so no AudioContext is created until the user interacts.
 * Idempotent — safe to call multiple times.
 */
export async function initAudio(): Promise<void> {
	if (initialized) return;

	// Dynamic import — Tone.js AudioContext only created here, after user gesture
	Tone = await import("tone");
	await Tone.start();

	masterGain = new Tone.Gain(masterVolume).toDestination();
	sfxGain = new Tone.Gain(sfxVolume).connect(masterGain);
	musicGain = new Tone.Gain(musicVolume).connect(masterGain);
	ambientGain = new Tone.Gain(ambientVolume).connect(masterGain);

	initialized = true;
}

/**
 * Check if the audio engine has been initialized.
 */
export function isAudioInitialized(): boolean {
	return initialized;
}

/**
 * Get the SFX output node. All SFX synths connect here.
 */
export function getSfxOutput(): Gain | null {
	return sfxGain;
}

/**
 * Get the music output node. Adaptive music connects here.
 */
export function getMusicOutput(): Gain | null {
	return musicGain;
}

/**
 * Get the ambient output node. Ambient soundscape connects here.
 */
export function getAmbientOutput(): Gain | null {
	return ambientGain;
}

// ─── Volume Controls ─────────────────────────────────────────────────────────

export function setMasterVolume(v: number) {
	masterVolume = Math.max(0, Math.min(1, v));
	if (masterGain) masterGain.gain.value = masterVolume;
}

export function setSfxVolume(v: number) {
	sfxVolume = Math.max(0, Math.min(1, v));
	if (sfxGain) sfxGain.gain.value = sfxVolume;
}

export function setMusicVolume(v: number) {
	musicVolume = Math.max(0, Math.min(1, v));
	if (musicGain) musicGain.gain.value = musicVolume;
}

export function setAmbientVolume(v: number) {
	ambientVolume = Math.max(0, Math.min(1, v));
	if (ambientGain) ambientGain.gain.value = ambientVolume;
}

export function getMasterVolume(): number {
	return masterVolume;
}
export function getSfxVolumeLevel(): number {
	return sfxVolume;
}
export function getMusicVolumeLevel(): number {
	return musicVolume;
}
export function getAmbientVolumeLevel(): number {
	return ambientVolume;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Dispose all audio nodes. Call on game exit.
 * Async to ensure sub-modules release their references before gain nodes are disposed.
 */
export async function disposeAudio() {
	// Dispose sfx/music/ambience first (they hold references to gain nodes)
	await Promise.allSettled([
		import("./sfx")
			.then((m) => m.disposeSfxPools())
			.catch((e) => console.error("[audioEngine] sfx dispose failed:", e)),
		import("./music")
			.then((m) => m.stopMusic())
			.catch((e) => console.error("[audioEngine] music stop failed:", e)),
		import("./ambience")
			.then((m) => m.stopAmbience())
			.catch((e) => console.error("[audioEngine] ambience stop failed:", e)),
	]);

	// Now safe to dispose gain nodes — sub-modules have released them
	masterGain?.dispose();
	sfxGain?.dispose();
	musicGain?.dispose();
	ambientGain?.dispose();
	masterGain = null;
	sfxGain = null;
	musicGain = null;
	ambientGain = null;
	initialized = false;
}

/**
 * Reset audio engine state — for testing.
 */
export async function _resetAudioEngine() {
	await disposeAudio();
	masterVolume = 0.8;
	sfxVolume = 0.7;
	musicVolume = 0.5;
	ambientVolume = 0.6;
}
