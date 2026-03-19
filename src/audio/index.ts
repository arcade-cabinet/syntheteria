/**
 * @package audio
 *
 * Tone.js audio engine — SFX, music routing, and storm ambience.
 */

// --- Engine lifecycle ---
export {
	initAudio,
	isAudioInitialized,
	getSfxOutput,
	getMusicOutput,
	getAmbientOutput,
	setMasterVolume,
	setSfxVolume,
	setMusicVolume,
	setAmbientVolume,
	getMasterVolume,
	getSfxVolumeLevel,
	getMusicVolumeLevel,
	getAmbientVolumeLevel,
	disposeAudio,
	_resetAudioEngine,
} from "./audioEngine";

// --- SFX ---
export { playSfx, disposeSfxPools } from "./sfx";
export type { SfxName } from "./sfx";

// --- Ambience ---
export { startAmbience, stopAmbience } from "./ambience";
