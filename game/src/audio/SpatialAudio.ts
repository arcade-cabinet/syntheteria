/**
 * 3D spatial audio system for Syntheteria.
 *
 * Uses the Web Audio API PannerNode (via Tone.Panner3D) for distance-based
 * attenuation and stereo positioning. Sounds are placed in world coordinates
 * and automatically attenuate based on distance from the listener (camera).
 *
 * Re-exports convenience wrappers used by AudioSystem.tsx so the existing
 * import contract is preserved.
 */

import * as Tone from "tone";
import { playMetalImpact as gameSoundsMetalImpact } from "./GameSounds";
import {
	disposeAudio as engineDispose,
	initAudio as engineInit,
	isAudioInitialized as engineIsInit,
	getCategoryBus,
	isAudioInitialized,
} from "./SoundEngine";
import {
	startStormAmbience,
	stopStormAmbience,
	updateStormAudio,
} from "./StormAmbience";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface SpatialOptions {
	/** Maximum audible distance (default 50). */
	maxDistance?: number;
	/** Reference distance for attenuation curve (default 1). */
	refDistance?: number;
	/** Rolloff factor — higher = faster attenuation (default 1). */
	rolloffFactor?: number;
	/** Volume offset in dB (default 0). */
	volumeDb?: number;
}

// ---------------------------------------------------------------------------
// Listener management
// ---------------------------------------------------------------------------

let listenerPosition: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Update the listener (camera) position. Call each frame from the render loop.
 */
export function setListenerPosition(pos: Vec3): void {
	listenerPosition = pos;
	// Tone.Listener maps to the AudioContext listener
	if (isAudioInitialized()) {
		const ctx = Tone.getContext();
		const listener = ctx.rawContext.listener;
		if (listener.positionX) {
			// Modern API (AudioListener with AudioParams)
			listener.positionX.value = pos.x;
			listener.positionY.value = pos.y;
			listener.positionZ.value = pos.z;
		} else if (typeof listener.setPosition === "function") {
			// Legacy API fallback
			(
				listener as unknown as {
					setPosition: (x: number, y: number, z: number) => void;
				}
			).setPosition(pos.x, pos.y, pos.z);
		}
	}
}

/**
 * Get the current listener position.
 */
export function getListenerPosition(): Vec3 {
	return listenerPosition;
}

// ---------------------------------------------------------------------------
// Spatial sound playback
// ---------------------------------------------------------------------------

/**
 * Play a one-shot synthesized sound at a 3D world position.
 *
 * The caller provides a factory that builds a Tone.js signal chain and
 * returns a dispose callback + duration. The factory receives a Tone.Panner3D
 * node that is already connected to the appropriate category bus — the factory
 * should connect its final output to this panner.
 *
 * @param position  - World-space coordinates.
 * @param factory   - Builds audio nodes, connects to panner, returns cleanup.
 * @param options   - Distance model parameters and volume.
 */
export function playSpatial(
	position: Vec3,
	factory: (panner: Tone.Panner3D) => {
		dispose: () => void;
		durationMs: number;
	},
	options?: SpatialOptions,
): void {
	if (!isAudioInitialized()) return;

	const bus = getCategoryBus("sfx");
	if (!bus) return;

	const maxDist = options?.maxDistance ?? 50;
	const refDist = options?.refDistance ?? 1;
	const rolloff = options?.rolloffFactor ?? 1;

	const panner = new Tone.Panner3D({
		positionX: position.x,
		positionY: position.y,
		positionZ: position.z,
		maxDistance: maxDist,
		refDistance: refDist,
		rolloffFactor: rolloff,
		distanceModel: "inverse",
		panningModel: "HRTF",
	});

	if (options?.volumeDb) {
		const offsetVol = new Tone.Volume(options.volumeDb);
		panner.connect(offsetVol);
		offsetVol.connect(bus);

		const { dispose: innerDispose, durationMs } = factory(panner);

		setTimeout(() => {
			innerDispose();
			panner.dispose();
			offsetVol.dispose();
		}, durationMs);
	} else {
		panner.connect(bus);

		const { dispose: innerDispose, durationMs } = factory(panner);

		setTimeout(() => {
			innerDispose();
			panner.dispose();
		}, durationMs);
	}
}

/**
 * Play a metallic impact sound at a 3D position (e.g. combat hit location).
 */
export function playSpatialMetalImpact(position: Vec3): void {
	playSpatial(
		position,
		(panner) => {
			const synth = new Tone.MetalSynth({
				envelope: { attack: 0.001, decay: 0.2, release: 0.3 },
				harmonicity: 3.1,
				modulationIndex: 16,
				resonance: 2000,
				octaves: 1.5,
			});
			synth.volume.value = -12;
			synth.connect(panner);
			synth.triggerAttackRelease("C2", 0.15);

			return {
				dispose: () => synth.dispose(),
				durationMs: 1000,
			};
		},
		{ maxDistance: 40, refDistance: 2 },
	);
}

/**
 * Play a machinery hum at a 3D position. Returns a stop function.
 * Useful for fabrication units and lightning rods.
 */
export function playSpatialMachineHum(position: Vec3): (() => void) | null {
	if (!isAudioInitialized()) return null;

	const bus = getCategoryBus("ambience");
	if (!bus) return null;

	const panner = new Tone.Panner3D({
		positionX: position.x,
		positionY: position.y,
		positionZ: position.z,
		maxDistance: 30,
		refDistance: 2,
		rolloffFactor: 1.5,
		distanceModel: "inverse",
		panningModel: "HRTF",
	});
	panner.connect(bus);

	const osc = new Tone.Oscillator({ frequency: 60, type: "sawtooth" });
	const filter = new Tone.Filter(200, "lowpass");
	const vol = new Tone.Volume(-24);

	osc.connect(filter);
	filter.connect(vol);
	vol.connect(panner);
	osc.start();

	return () => {
		osc.stop();
		osc.dispose();
		filter.dispose();
		vol.dispose();
		panner.dispose();
	};
}

/**
 * Play an electrical crackle at a 3D position (lightning rod discharge).
 */
export function playSpatialCrackle(position: Vec3): void {
	playSpatial(
		position,
		(panner) => {
			const noise = new Tone.Noise("white");
			const filter = new Tone.Filter({
				frequency: 3000 + Math.random() * 2000,
				type: "highpass",
			});
			const crusher = new Tone.BitCrusher(3);
			const env = new Tone.AmplitudeEnvelope({
				attack: 0.002,
				decay: 0.05 + Math.random() * 0.05,
				sustain: 0.1,
				release: 0.12,
			});

			noise.connect(crusher);
			crusher.connect(filter);
			filter.connect(env);
			env.connect(panner);

			noise.start();
			env.triggerAttackRelease(0.08 + Math.random() * 0.06);

			return {
				dispose: () => {
					noise.stop();
					noise.dispose();
					filter.dispose();
					crusher.dispose();
					env.dispose();
				},
				durationMs: 600,
			};
		},
		{ maxDistance: 35, refDistance: 3 },
	);
}

// ---------------------------------------------------------------------------
// Backward-compatible re-exports (used by AudioSystem.tsx)
// ---------------------------------------------------------------------------

/**
 * Initialize audio — delegates to SoundEngine, then starts storm ambience.
 */
export async function initAudio(): Promise<void> {
	await engineInit();
	startStormAmbience();
}

/**
 * Dispose all audio — stops storm, then tears down SoundEngine.
 */
export function disposeAudio(): void {
	stopStormAmbience();
	engineDispose();
}

/**
 * Update storm intensity — delegates to StormAmbience module.
 */
export function updateStormIntensity(intensity: number): void {
	updateStormAudio(intensity);
}

/**
 * Play a non-spatial metal impact sound — delegates to GameSounds.
 */
export function playMetalImpact(): void {
	gameSoundsMetalImpact();
}

/**
 * Check if audio is initialized.
 */
export { engineIsInit as isAudioInitialized };
