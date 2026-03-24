/**
 * @package audio
 *
 * Tone.js audio engine — SFX, music routing, and storm ambience.
 */

// --- Ambience ---
export { startAmbience, stopAmbience } from "./ambience";
// --- Engine lifecycle ---
export {
	_resetAudioEngine,
	disposeAudio,
	getAmbientOutput,
	getAmbientVolumeLevel,
	getMasterVolume,
	getMusicOutput,
	getMusicVolumeLevel,
	getSfxOutput,
	getSfxVolumeLevel,
	initAudio,
	isAudioInitialized,
	setAmbientVolume,
	setMasterVolume,
	setMusicVolume,
	setSfxVolume,
} from "./audioEngine";
// --- Music ---
export {
	getCurrentMusicEpoch,
	isMusicPlaying,
	setMusicVolumeLevel,
	startMusic,
	stopMusic,
} from "./music";
export type { SfxName } from "./sfx";
// --- SFX ---
export { disposeSfxPools, playSfx } from "./sfx";
