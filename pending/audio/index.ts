/**
 * Audio module — barrel export.
 *
 * Provides the full audio stack for Syntheteria:
 * - audioEngine: Tone.js init, volume channels
 * - sfxLibrary: procedural SFX (combat, harvest, construction, turn, cultist)
 * - adaptiveMusic: state-driven background music with crossfade
 * - ambientSoundscape: wind, machinery, thunder, metal creaking
 * - audioHooks: wiring into game system events
 */

export {
	getMusicState,
	type MusicState,
	setMusicState,
	startMusic,
	stopMusic,
} from "./adaptiveMusic";
export {
	isAmbientStarted,
	startAmbientSoundscape,
	stopAmbientSoundscape,
	updateStormIntensity,
} from "./ambientSoundscape";
export {
	disposeAudio,
	getAmbientVolumeLevel,
	getMasterVolume,
	getMusicVolumeLevel,
	getSfxVolumeLevel,
	initAudio,
	isAudioInitialized,
	setAmbientVolume,
	setMasterVolume,
	setMusicVolume,
	setSfxVolume,
} from "./audioEngine";

export { audioSystemTick, resetAudioHooks } from "./audioHooks";

export {
	playAIPhaseDrone,
	playAttackClang,
	playBuildingComplete,
	playComponentBreak,
	playConstructionHammer,
	playCultistAttack,
	playCultistSpawn,
	playEnergyBurst,
	playHarvestGrind,
	playHitImpact,
	playLightningCall,
	playMaterialCollected,
	playNewTurnFanfare,
	playStageComplete,
	playTurnStartChime,
	playUnitDestroyed,
	playWeldingSizzle,
} from "./sfxLibrary";
