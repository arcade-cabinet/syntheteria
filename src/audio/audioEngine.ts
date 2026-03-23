/**
 * Audio Engine — Core Tone.js setup with volume channels.
 *
 * Provides master, SFX, music, and ambient volume channels.
 * All audio in the game routes through these channels.
 *
 * Must call initAudio() once on first user interaction (click/tap)
 * to satisfy browser autoplay policies.
 */

import * as Tone from "tone";

// ─── Volume Channels ─────────────────────────────────────────────────────────

let masterGain: Tone.Gain | null = null;
let sfxGain: Tone.Gain | null = null;
let musicGain: Tone.Gain | null = null;
let ambientGain: Tone.Gain | null = null;

let initialized = false;

// ─── Volume State (0-1 linear) ───────────────────────────────────────────────

let masterVolume = 0.8;
let sfxVolume = 0.7;
let musicVolume = 0.5;
let ambientVolume = 0.6;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize the audio engine. Call once on first user gesture.
 * Idempotent — safe to call multiple times.
 */
export async function initAudio(): Promise<void> {
	if (initialized) return;

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
export function getSfxOutput(): Tone.Gain | null {
	return sfxGain;
}

/**
 * Get the music output node. Adaptive music connects here.
 */
export function getMusicOutput(): Tone.Gain | null {
	return musicGain;
}

/**
 * Get the ambient output node. Ambient soundscape connects here.
 */
export function getAmbientOutput(): Tone.Gain | null {
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
 */
export function disposeAudio() {
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
export function _resetAudioEngine() {
	disposeAudio();
	masterVolume = 0.8;
	sfxVolume = 0.7;
	musicVolume = 0.5;
	ambientVolume = 0.6;
}
