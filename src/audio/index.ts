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
	initAudio,
	isAudioInitialized,
	disposeAudio,
	setMasterVolume,
	setSfxVolume,
	setMusicVolume,
	setAmbientVolume,
	getMasterVolume,
	getSfxVolumeLevel,
	getMusicVolumeLevel,
	getAmbientVolumeLevel,
} from "./audioEngine";

export {
	startMusic,
	stopMusic,
	setMusicState,
	getMusicState,
	type MusicState,
} from "./adaptiveMusic";

export {
	startAmbientSoundscape,
	stopAmbientSoundscape,
	updateStormIntensity,
	isAmbientStarted,
} from "./ambientSoundscape";

export { audioSystemTick, resetAudioHooks } from "./audioHooks";

export {
	playAttackClang,
	playEnergyBurst,
	playHitImpact,
	playComponentBreak,
	playUnitDestroyed,
	playHarvestGrind,
	playMaterialCollected,
	playConstructionHammer,
	playWeldingSizzle,
	playStageComplete,
	playBuildingComplete,
	playTurnStartChime,
	playAIPhaseDrone,
	playNewTurnFanfare,
	playCultistSpawn,
	playCultistAttack,
	playLightningCall,
} from "./sfxLibrary";
