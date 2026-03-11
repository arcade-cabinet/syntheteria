/**
 * Audio module barrel export.
 *
 * Re-exports all public audio APIs for convenient single-path imports:
 *
 *   import { initAudioBridge, playGrinding, AudioSettingsPanel } from './audio';
 */

// Core engine — lifecycle, volume control, bus access
export {
	initAudio,
	disposeAudio,
	isAudioInitialized,
	setMasterVolume,
	setCategoryVolume,
	getCategoryBus,
	getMasterBus,
	playSound,
	startLoop,
	stopLoop,
	isLoopActive,
	type AudioCategory,
	type PlaySoundOptions,
	type LoopOptions,
} from "./SoundEngine";

// Synthesized one-shot game sounds
export {
	playGrinding,
	playCompression,
	playCubePlace,
	playCubeGrab,
	playMachineHum,
	playAlert,
	playDamage,
	playMetalImpact,
	playUIBeep,
	playLightningStrike,
} from "./GameSounds";

// 3D spatial audio
export {
	setListenerPosition,
	getListenerPosition,
	playSpatial,
	playSpatialMetalImpact,
	playSpatialMachineHum,
	playSpatialCrackle,
	updateStormIntensity,
	type Vec3 as AudioVec3,
	type SpatialOptions,
} from "./SpatialAudio";

// Storm ambience
export {
	startStormAmbience,
	stopStormAmbience,
	updateStormAudio,
	playThunder,
	playElectricalCrackle,
	isStormAmbienceStarted,
} from "./StormAmbience";

// Factory-specific sounds
export {
	playBeltMotor,
	playDrillSound,
	playProcessorHum,
	playHackingNoise,
	playFootstep,
	playBeltItem,
	playCultistLightning,
} from "./FactoryAudio";

// Procedural game-event sounds
export {
	playHarvesting,
	playCompressionThump,
	playCubePickup,
	playCubeDrop,
	playBeltHum,
	playPowerUp,
	playDamageTaken,
	playQuestComplete,
} from "./SynthSounds";

// Event bridge — wires gameplay events to sounds
export {
	initAudioBridge,
	disposeAudioBridge,
	onBuildingPlaced,
	onUIInteraction,
} from "./AudioEventBridge";

// Factory and combat SFX library (config-driven)
export {
	playFurnaceRoar,
	playHydraulicPress,
	playMagneticHum,
	playBeltClank,
	playLaserShot,
	playCombatImpact,
} from "./SFXLibrary";

// Per-biome ambient soundscapes with crossfading
export {
	setBiome,
	stopBiomeAmbience,
	getActiveBiome,
	isBiomeAmbienceActive,
	type BiomeId,
} from "./BiomeAmbience";

// Adaptive music system
export {
	startAdaptiveMusic,
	stopAdaptiveMusic,
	setMusicState,
	getMusicState,
	isAdaptiveMusicRunning,
	type MusicState,
} from "./AdaptiveMusic";

// Audio quality tier integration
export {
	applyAudioQuality,
	acquireVoice,
	releaseVoice,
	getActiveVoiceCount,
	isReverbAllowed,
	isSpatialAllowed,
	getMaxPolyphony,
} from "./AudioQuality";

// R3F audio system component
export { AudioSystem } from "./AudioSystem";

// Audio settings UI panel
export { AudioSettingsPanel, type AudioSettingsPanelProps } from "./AudioSettingsPanel";
