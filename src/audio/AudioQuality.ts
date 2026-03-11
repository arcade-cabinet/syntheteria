/**
 * Audio quality tier integration for Syntheteria.
 *
 * Reads the current quality tier from QualityTier and applies audio-specific
 * limits:
 *   - maxPolyphony: voice stealing when too many sounds play simultaneously
 *   - spatialAudioEnabled: Panner3D on high/medium, mono on low
 *   - biomeAmbienceEnabled: disable layered biome audio on low-end
 *   - adaptiveMusicEnabled: always on (minimal CPU) unless explicitly off
 *   - reverbEnabled: Tone.js Reverb nodes are CPU-expensive; disabled on low
 *
 * Usage:
 *   applyAudioQuality()   — call after detectQualityTier() to push settings
 *   isReverbAllowed()     — check before creating any Reverb node
 *   isSpatialAllowed()    — check before creating Panner3D
 *   getMaxPolyphony()     — voice count limit for playSound throttling
 */

import { getAudioQuality } from "../rendering/QualityTier";
import { setBiome, stopBiomeAmbience, getActiveBiome } from "./BiomeAmbience";
import {
	startAdaptiveMusic,
	stopAdaptiveMusic,
	isAdaptiveMusicRunning,
	getMusicState,
	setMusicState,
} from "./AdaptiveMusic";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let applied = false;
let _reverbEnabled = true;
let _spatialEnabled = true;
let _maxPolyphony = 32;

// Active voice count — incremented by playSound, decremented on dispose
let activeVoices = 0;

// ---------------------------------------------------------------------------
// Apply quality
// ---------------------------------------------------------------------------

/**
 * Push current quality tier settings into the audio subsystems.
 * Safe to call multiple times — re-applies when tier changes.
 */
export function applyAudioQuality(): void {
	const q = getAudioQuality();
	_reverbEnabled = q.reverbEnabled;
	_spatialEnabled = q.spatialAudioEnabled;
	_maxPolyphony = q.maxPolyphony;

	// Biome ambience: stop if tier no longer supports it
	if (!q.biomeAmbienceEnabled) {
		stopBiomeAmbience();
	} else if (!applied) {
		// On first apply, restore last biome if any (no-op on first init)
		const biome = getActiveBiome();
		if (biome) setBiome(biome);
	}

	// Adaptive music: always minimal CPU cost, only stop if explicitly disabled
	if (!q.adaptiveMusicEnabled && isAdaptiveMusicRunning()) {
		stopAdaptiveMusic();
	} else if (q.adaptiveMusicEnabled && !isAdaptiveMusicRunning()) {
		// Music starts via initAudio → AdaptiveMusic — only start if music was
		// already running before a tier change (e.g. downgrade then upgrade)
		const state = getMusicState();
		if (state) {
			startAdaptiveMusic();
			setMusicState(state);
		}
	}

	applied = true;
}

// ---------------------------------------------------------------------------
// Voice management
// ---------------------------------------------------------------------------

/**
 * Try to acquire a voice slot. Returns true if a new sound can play,
 * false if the polyphony limit is reached (caller should skip the sound).
 *
 * Call this before creating any one-shot sound node.
 */
export function acquireVoice(): boolean {
	if (activeVoices >= _maxPolyphony) return false;
	activeVoices++;
	return true;
}

/**
 * Release a voice slot. Call this in the dispose callback of a sound.
 */
export function releaseVoice(): void {
	if (activeVoices > 0) activeVoices--;
}

/**
 * Get the current number of active audio voices.
 */
export function getActiveVoiceCount(): number {
	return activeVoices;
}

// ---------------------------------------------------------------------------
// Feature queries
// ---------------------------------------------------------------------------

/**
 * Whether Tone.js Reverb nodes are permitted at the current quality tier.
 * Check before creating any new Reverb to avoid CPU spikes on mobile.
 */
export function isReverbAllowed(): boolean {
	return _reverbEnabled;
}

/**
 * Whether 3D spatial audio (Panner3D) is enabled at the current quality tier.
 * On "low" tier, sounds play mono without distance attenuation.
 */
export function isSpatialAllowed(): boolean {
	return _spatialEnabled;
}

/**
 * Maximum simultaneous audio voices at the current quality tier.
 */
export function getMaxPolyphony(): number {
	return _maxPolyphony;
}

// ---------------------------------------------------------------------------
// Reset (for tests)
// ---------------------------------------------------------------------------

/** Reset to default high-tier values. Used in tests. */
export function _resetAudioQuality(): void {
	applied = false;
	_reverbEnabled = true;
	_spatialEnabled = true;
	_maxPolyphony = 32;
	activeVoices = 0;
}
